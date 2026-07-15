//! ACP client subsystem.
//!
//! Spawns an external coding agent (`codex-acp`, `claude-agent-acp`, Cursor's
//! `agent acp`, `pi-acp`, …) as a stdio subprocess via [`agent_client_protocol`]
//! and drives the `initialize` -> `session/new` -> `session/prompt` lifecycle.
//! A session stays alive across multiple prompts: `acp_spawn_agent` starts a
//! background task that owns the `ConnectionTo<Agent>` and processes commands
//! sent over an mpsc channel, because the connection only lives for the
//! duration of the `connect_with` future.
//!
//! `session/update` notifications are re-emitted to the webview as
//! `acp://session-update`; `session/request_permission` requests are re-emitted
//! as `acp://permission-request` and held open (the `Responder` is stashed in
//! [`AcpState`]) until the webview calls `acp_respond_permission`.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use agent_client_protocol::schema::v1::{
    CancelNotification, ClientCapabilities, ContentBlock, FileSystemCapabilities,
    InitializeRequest, McpServer, McpServerHttp, NewSessionRequest, PermissionOptionId,
    PromptRequest, RequestPermissionOutcome, RequestPermissionRequest, RequestPermissionResponse,
    SelectedPermissionOutcome, SessionNotification, TextContent,
};
use agent_client_protocol::schema::ProtocolVersion;
use agent_client_protocol::{AcpAgent, Agent, Client, ConnectionTo, Responder};
use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

/// Commands sent into a running session's background task.
enum SessionCommand {
    Prompt {
        text: String,
        reply: oneshot::Sender<Result<String, String>>,
    },
    Cancel,
}

/// Plugin-managed state: one entry per spawned session (keyed by an internal
/// session key we mint in `acp_spawn_agent`, not the ACP-protocol session id),
/// plus pending `session/request_permission` responders keyed by a request id
/// we hand to the webview.
#[derive(Default)]
pub struct AcpState {
    sessions: Mutex<HashMap<String, mpsc::UnboundedSender<SessionCommand>>>,
    permission_responders: Mutex<HashMap<String, Responder<RequestPermissionResponse>>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnAgentArgs {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    pub cwd: String,
    /// Loopback URL of this app's domain MCP bridge (`mcp_bridge`), if the app
    /// registered a catalog. `None` when the agent should get no domain tools.
    #[serde(default)]
    pub mcp_bridge_url: Option<String>,
    #[serde(default)]
    pub allow_fs: bool,
    #[serde(default)]
    pub allow_terminal: bool,
}

/// `session/update` re-emitted to the webview verbatim as JSON (the JS side —
/// `core/acp-agent.js` — is the only place that needs to understand ACP's
/// content-block/tool-call shapes).
#[derive(serde::Serialize, Clone)]
struct SessionUpdateEvent {
    #[serde(rename = "sessionKey")]
    session_key: String,
    update: Value,
}

#[derive(serde::Serialize, Clone)]
struct PermissionRequestEvent {
    #[serde(rename = "sessionKey")]
    session_key: String,
    #[serde(rename = "requestId")]
    request_id: String,
    #[serde(rename = "toolCall")]
    tool_call: Value,
    options: Vec<PermissionOptionView>,
}

#[derive(serde::Serialize, Clone)]
struct PermissionOptionView {
    #[serde(rename = "optionId")]
    option_id: String,
    name: String,
}

/// Spawn `command args…` as an ACP agent subprocess, run `initialize` +
/// `session/new`, and keep the session alive in a background task. Returns an
/// internal session key to pass to `acp_prompt`/`acp_cancel`.
#[tauri::command]
pub async fn acp_spawn_agent<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AcpState>,
    args: SpawnAgentArgs,
) -> Result<String, String> {
    let session_key = Uuid::new_v4().to_string();

    // `AcpAgent::from_args` treats leading `NAME=value` items as env vars, so we
    // put those first, then the command, then its args.
    let mut acp_args: Vec<String> = args.env.iter().map(|(k, v)| format!("{k}={v}")).collect();
    acp_args.push(args.command.clone());
    acp_args.extend(args.args.iter().cloned());

    let agent = AcpAgent::from_args(acp_args).map_err(|e| e.to_string())?;

    let (tx, rx) = mpsc::unbounded_channel::<SessionCommand>();
    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(session_key.clone(), tx);
    }

    let mut client_capabilities = ClientCapabilities::default();
    client_capabilities.fs = FileSystemCapabilities::new()
        .read_text_file(args.allow_fs)
        .write_text_file(args.allow_fs);
    client_capabilities.terminal = args.allow_terminal;

    let mut mcp_servers = Vec::new();
    if let Some(url) = &args.mcp_bridge_url {
        mcp_servers.push(McpServer::Http(McpServerHttp::new(
            "domain-catalog",
            url.clone(),
        )));
    }

    let cwd = PathBuf::from(&args.cwd);
    let session_key_for_task = session_key.clone();

    // The connection only lives for the duration of this future, so a
    // long-lived session means running the whole lifecycle — init, session/new,
    // then a command loop — inside one spawned task.
    tokio::spawn(async move {
        let app_for_updates = app.clone();
        let app_for_permissions = app.clone();
        let session_key_for_updates = session_key_for_task.clone();
        let session_key_for_permissions = session_key_for_task.clone();

        let result = Client
            .builder()
            .on_receive_notification(
                move |notification: SessionNotification, _cx| {
                    let app = app_for_updates.clone();
                    let session_key = session_key_for_updates.clone();
                    async move {
                        let _ = app.emit(
                            "acp://session-update",
                            SessionUpdateEvent {
                                session_key,
                                update: serde_json::to_value(&notification.update)
                                    .unwrap_or(Value::Null),
                            },
                        );
                        Ok(())
                    }
                },
                agent_client_protocol::on_receive_notification!(),
            )
            .on_receive_request(
                move |request: RequestPermissionRequest, responder, _connection| {
                    let app = app_for_permissions.clone();
                    let session_key = session_key_for_permissions.clone();
                    async move {
                        let request_id = Uuid::new_v4().to_string();
                        let tool_call =
                            serde_json::to_value(&request.tool_call).unwrap_or(Value::Null);
                        let options = request
                            .options
                            .iter()
                            .map(|opt| PermissionOptionView {
                                option_id: opt.option_id.0.to_string(),
                                name: opt.name.clone(),
                            })
                            .collect();

                        if let Some(acp_state) = app.try_state::<AcpState>() {
                            if let Ok(mut responders) = acp_state.permission_responders.lock() {
                                responders.insert(request_id.clone(), responder);
                            }
                        }

                        let _ = app.emit(
                            "acp://permission-request",
                            PermissionRequestEvent {
                                session_key,
                                request_id,
                                tool_call,
                                options,
                            },
                        );
                        Ok(())
                    }
                },
                agent_client_protocol::on_receive_request!(),
            )
            .connect_with(agent, |connection: ConnectionTo<Agent>| async move {
                connection
                    .send_request(
                        InitializeRequest::new(ProtocolVersion::V1)
                            .client_capabilities(client_capabilities),
                    )
                    .block_task()
                    .await?;

                let new_session = connection
                    .send_request(NewSessionRequest::new(cwd).mcp_servers(mcp_servers))
                    .block_task()
                    .await?;

                let session_id = new_session.session_id;
                let mut rx = rx;

                while let Some(cmd) = rx.recv().await {
                    match cmd {
                        SessionCommand::Prompt { text, reply } => {
                            let response = connection
                                .send_request(PromptRequest::new(
                                    session_id.clone(),
                                    vec![ContentBlock::Text(TextContent::new(text))],
                                ))
                                .block_task()
                                .await;
                            let outcome = response
                                .map(|r| stop_reason_str(&r.stop_reason).to_string())
                                .map_err(|e| e.to_string());
                            let _ = reply.send(outcome);
                        }
                        SessionCommand::Cancel => {
                            let _ = connection
                                .send_notification(CancelNotification::new(session_id.clone()));
                        }
                    }
                }

                Ok(())
            })
            .await;

        if let Err(err) = result {
            let _ = app.emit(
                "acp://session-error",
                serde_json::json!({ "sessionKey": session_key_for_task, "error": err.to_string() }),
            );
        }
    });

    Ok(session_key)
}

fn stop_reason_str(reason: &agent_client_protocol::schema::v1::StopReason) -> &'static str {
    use agent_client_protocol::schema::v1::StopReason;
    match reason {
        StopReason::EndTurn => "end_turn",
        StopReason::MaxTokens => "max_tokens",
        StopReason::MaxTurnRequests => "max_turn_requests",
        StopReason::Refusal => "refusal",
        StopReason::Cancelled => "cancelled",
        _ => "unknown",
    }
}

/// Send a prompt on an already-spawned session and wait for the turn to end.
/// Message/tool-call content streams separately via `acp://session-update`;
/// this only returns the terminal `stopReason`.
#[tauri::command]
pub async fn acp_prompt(
    state: State<'_, AcpState>,
    session_key: String,
    text: String,
) -> Result<String, String> {
    let tx = {
        let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions
            .get(&session_key)
            .cloned()
            .ok_or_else(|| format!("no such ACP session: {session_key}"))?
    };
    let (reply_tx, reply_rx) = oneshot::channel();
    tx.send(SessionCommand::Prompt {
        text,
        reply: reply_tx,
    })
    .map_err(|_| "ACP session task is no longer running".to_string())?;
    reply_rx
        .await
        .map_err(|_| "ACP session task dropped the reply channel".to_string())?
}

/// Ask the agent to cancel the in-flight prompt turn (its `session/prompt`
/// call resolves with `stopReason: "cancelled"`).
#[tauri::command]
pub async fn acp_cancel(state: State<'_, AcpState>, session_key: String) -> Result<(), String> {
    let tx = {
        let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions
            .get(&session_key)
            .cloned()
            .ok_or_else(|| format!("no such ACP session: {session_key}"))?
    };
    tx.send(SessionCommand::Cancel)
        .map_err(|_| "ACP session task is no longer running".to_string())
}

/// Resolve a pending `session/request_permission` call the agent made.
#[tauri::command]
pub fn acp_respond_permission(
    state: State<'_, AcpState>,
    request_id: String,
    option_id: String,
) -> Result<(), String> {
    let responder = {
        let mut responders = state
            .permission_responders
            .lock()
            .map_err(|e| e.to_string())?;
        responders
            .remove(&request_id)
            .ok_or_else(|| format!("no such permission request: {request_id}"))?
    };
    responder
        .respond(RequestPermissionResponse::new(
            RequestPermissionOutcome::Selected(SelectedPermissionOutcome::new(
                PermissionOptionId::from(option_id),
            )),
        ))
        .map_err(|e| e.to_string())
}

/// Per-machine default agent kind, read from `ACP_DEFAULT_AGENT` (e.g.
/// `codex`/`claude`/`cursor`/`pi`) — not a credential, just which CLI a given
/// developer has installed, so no settings file like `omlx_config`.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcpConfig {
    default_agent_kind: Option<String>,
}

#[tauri::command]
pub fn acp_config() -> AcpConfig {
    AcpConfig {
        default_agent_kind: std::env::var("ACP_DEFAULT_AGENT")
            .ok()
            .filter(|s| !s.is_empty()),
    }
}
