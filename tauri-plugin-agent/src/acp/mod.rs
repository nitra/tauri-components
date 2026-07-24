//! ACP client subsystem — thin Tauri adapter over `llm_lib::acp::session`.
//!
//! The ACP protocol work (spawn, `initialize` -> `session/new` handshake,
//! prompt turns, idle-timeout, cancel) lives in the shared `llm-lib` crate
//! (repo `nitra/7n-rules`, spec Ф4/T9); this module only adapts it to Tauri:
//! `session/update` events are re-emitted to the webview as
//! `acp://session-update`, `session/request_permission` requests are
//! re-emitted as `acp://permission-request` and held open (the crate's
//! [`PermissionRequestEvent`] is stashed in [`AcpState`]) until the webview
//! calls `acp_respond_permission`, and live [`SessionHandle`]s are kept per
//! session key for `acp_prompt`/`acp_cancel`.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use agent_client_protocol::schema::v1::{
    ClientCapabilities, FileSystemCapabilities, McpServer, McpServerHttp, PermissionOptionId,
};
use agent_client_protocol::AcpAgent;
use llm_lib::acp::session::{
    create_session, PermissionMode, PermissionRequestEvent, SessionEvent, SessionHandle,
    SessionOptions,
};
use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use uuid::Uuid;

/// Plugin-managed state: one live [`SessionHandle`] per spawned session
/// (keyed by an internal session key we mint in `acp_spawn_agent`, not the
/// ACP-protocol session id), plus pending `session/request_permission`
/// events keyed by a request id we hand to the webview.
#[derive(Default)]
pub struct AcpState {
    sessions: Mutex<HashMap<String, SessionHandle>>,
    permission_responders: Mutex<HashMap<String, PermissionRequestEvent>>,
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
struct PermissionRequestView {
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
    /// `allow_once`/`allow_always`/`reject_once`/`reject_always` — lets the
    /// webview pick the right option for a binary approve/reject decision
    /// without guessing from `name`.
    kind: String,
}

/// Spawn `command args…` as an ACP agent subprocess via the shared crate's
/// session API and keep the session alive. `create_session` itself waits for
/// the `initialize` + `session/new` handshake to succeed (or report its real
/// failure reason) before returning, so a caller that immediately follows up
/// with `acp_prompt` never races the handshake. Returns an internal session
/// key to pass to `acp_prompt`/`acp_cancel`.
#[tauri::command]
pub async fn acp_spawn_agent<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AcpState>,
    args: SpawnAgentArgs,
) -> Result<String, String> {
    let agent = AcpAgent::from_args(build_acp_args(&args.command, &args.args, &args.env))
        .map_err(|e| e.to_string())?;

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

    let options = SessionOptions {
        client_capabilities,
        mcp_servers,
        permission_mode: PermissionMode::External,
        ..SessionOptions::default()
    };

    let (handle, events) = create_session(agent, &PathBuf::from(&args.cwd), options)
        .await
        .map_err(|e| e.to_string())?;

    let session_key = Uuid::new_v4().to_string();
    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(session_key.clone(), handle);
    }
    forward_session_events(app, session_key.clone(), events);
    Ok(session_key)
}

/// Forward the crate's session event stream to the webview: `Update` becomes
/// `acp://session-update`, `PermissionRequest` is stashed in [`AcpState`]
/// under a fresh request id and announced as `acp://permission-request`.
fn forward_session_events<R: Runtime>(
    app: AppHandle<R>,
    session_key: String,
    mut events: tokio::sync::mpsc::UnboundedReceiver<SessionEvent>,
) {
    tokio::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                SessionEvent::Update(update) => {
                    let _ = app.emit(
                        "acp://session-update",
                        SessionUpdateEvent {
                            session_key: session_key.clone(),
                            update: serde_json::to_value(&*update).unwrap_or(Value::Null),
                        },
                    );
                }
                SessionEvent::PermissionRequest(request) => {
                    let request_id = Uuid::new_v4().to_string();
                    let view = PermissionRequestView {
                        session_key: session_key.clone(),
                        request_id: request_id.clone(),
                        tool_call: serde_json::to_value(&request.tool_call)
                            .unwrap_or(Value::Null),
                        options: request
                            .options
                            .iter()
                            .map(|opt| PermissionOptionView {
                                option_id: opt.option_id.0.to_string(),
                                name: opt.name.clone(),
                                kind: permission_option_kind_str(opt.kind).to_string(),
                            })
                            .collect(),
                    };
                    if let Some(acp_state) = app.try_state::<AcpState>() {
                        if let Ok(mut responders) = acp_state.permission_responders.lock() {
                            responders.insert(request_id, *request);
                        }
                    }
                    let _ = app.emit("acp://permission-request", view);
                }
            }
        }
    });
}

/// Compose the argv `AcpAgent::from_args` expects: leading `NAME=value` env
/// entries, then the command, then its args (`from_args` treats any leading
/// `NAME=value`-shaped items as env vars — see `AcpAgent::from_args` docs).
fn build_acp_args(command: &str, args: &[String], env: &HashMap<String, String>) -> Vec<String> {
    let mut acp_args: Vec<String> = env.iter().map(|(k, v)| format!("{k}={v}")).collect();
    acp_args.push(command.to_string());
    acp_args.extend(args.iter().cloned());
    acp_args
}

fn permission_option_kind_str(
    kind: agent_client_protocol::schema::v1::PermissionOptionKind,
) -> &'static str {
    use agent_client_protocol::schema::v1::PermissionOptionKind;
    match kind {
        PermissionOptionKind::AllowOnce => "allow_once",
        PermissionOptionKind::AllowAlways => "allow_always",
        PermissionOptionKind::RejectOnce => "reject_once",
        PermissionOptionKind::RejectAlways => "reject_always",
        _ => "unknown",
    }
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

/// Look up the live [`SessionHandle`] for a session key.
fn session_handle(state: &State<'_, AcpState>, session_key: &str) -> Result<SessionHandle, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    sessions
        .get(session_key)
        .cloned()
        .ok_or_else(|| format!("no such ACP session: {session_key}"))
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
    let handle = session_handle(&state, &session_key)?;
    handle
        .prompt(text)
        .await
        .map(|reason| stop_reason_str(&reason).to_string())
        .map_err(|e| e.to_string())
}

/// Ask the agent to cancel the in-flight prompt turn (its `session/prompt`
/// call resolves with `stopReason: "cancelled"`).
#[tauri::command]
pub async fn acp_cancel(state: State<'_, AcpState>, session_key: String) -> Result<(), String> {
    let handle = session_handle(&state, &session_key)?;
    handle.cancel().map_err(|e| e.to_string())
}

/// Resolve a pending `session/request_permission` call the agent made.
#[tauri::command]
pub fn acp_respond_permission(
    state: State<'_, AcpState>,
    request_id: String,
    option_id: String,
) -> Result<(), String> {
    let request = {
        let mut responders = state
            .permission_responders
            .lock()
            .map_err(|e| e.to_string())?;
        responders
            .remove(&request_id)
            .ok_or_else(|| format!("no such permission request: {request_id}"))?
    };
    request
        .respond(PermissionOptionId::from(option_id))
        .map_err(|e| e.to_string())
}

/// Per-machine default agent kind, read from `ACP_DEFAULT_AGENT` (e.g.
/// `codex`/`claude`/`cursor`/`pi`) — not a credential, just which CLI a given
/// developer has installed, so no settings file needed.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_acp_args_puts_env_before_command_before_args() {
        let mut env = HashMap::new();
        env.insert("API_KEY".to_string(), "secret".to_string());
        let args = build_acp_args("npx", &["-y".into(), "codex-acp".into()], &env);
        assert_eq!(args, vec!["API_KEY=secret", "npx", "-y", "codex-acp"]);
    }

    #[test]
    fn build_acp_args_with_no_env_or_args() {
        let args = build_acp_args("pi-acp", &[], &HashMap::new());
        assert_eq!(args, vec!["pi-acp"]);
    }

    #[test]
    fn permission_option_kind_str_covers_every_documented_kind() {
        use agent_client_protocol::schema::v1::PermissionOptionKind;
        assert_eq!(
            permission_option_kind_str(PermissionOptionKind::AllowOnce),
            "allow_once"
        );
        assert_eq!(
            permission_option_kind_str(PermissionOptionKind::AllowAlways),
            "allow_always"
        );
        assert_eq!(
            permission_option_kind_str(PermissionOptionKind::RejectOnce),
            "reject_once"
        );
        assert_eq!(
            permission_option_kind_str(PermissionOptionKind::RejectAlways),
            "reject_always"
        );
    }

    #[test]
    fn stop_reason_str_covers_every_documented_reason() {
        use agent_client_protocol::schema::v1::StopReason;
        assert_eq!(stop_reason_str(&StopReason::EndTurn), "end_turn");
        assert_eq!(stop_reason_str(&StopReason::MaxTokens), "max_tokens");
        assert_eq!(
            stop_reason_str(&StopReason::MaxTurnRequests),
            "max_turn_requests"
        );
        assert_eq!(stop_reason_str(&StopReason::Refusal), "refusal");
        assert_eq!(stop_reason_str(&StopReason::Cancelled), "cancelled");
    }
}
