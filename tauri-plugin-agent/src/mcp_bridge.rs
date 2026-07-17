//! Domain MCP bridge.
//!
//! Exposes the consuming app's tool catalog (registered once via
//! `acp_register_catalog`) as a loopback MCP HTTP server, so it can be listed
//! in `mcpServers` when spawning an ACP agent (`acp::acp_spawn_agent`). On
//! `tools/call` this bridge does not re-implement schema validation or
//! tier-gating — it emits an `acp://mcp-tool-call` event and waits for the
//! webview to call `acp_mcp_tool_result`, reusing whatever `createDispatch`
//! already does today.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rmcp::model::{
    CallToolRequestParams, CallToolResult, ContentBlock, ListToolsResult, PaginatedRequestParams,
    Tool,
};
use rmcp::service::{RequestContext, RoleServer};
use rmcp::transport::streamable_http_server::session::local::LocalSessionManager;
use rmcp::transport::streamable_http_server::{StreamableHttpServerConfig, StreamableHttpService};
use rmcp::{ErrorData, ServerHandler};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::sync::oneshot;
use uuid::Uuid;

/// How long a `tools/call` may sit pending — generous, since a destructive
/// catalog action can pause on a human approval in `AuditDialog`.
const TOOL_CALL_TIMEOUT: Duration = Duration::from_secs(300);

/// The registered catalog (raw JS `{tier, name, summary, input, tauri, …}`
/// entries — this bridge only reads `name`/`summary`/`input`) plus pending
/// `tools/call` replies, keyed by a request id minted here.
#[derive(Default)]
pub struct McpBridgeState {
    catalog: Mutex<Vec<Value>>,
    pending_calls: Mutex<HashMap<String, oneshot::Sender<Value>>>,
}

#[derive(Clone)]
struct CatalogHandler<R: Runtime> {
    app: AppHandle<R>,
    state: Arc<McpBridgeState>,
}

impl<R: Runtime> ServerHandler for CatalogHandler<R> {
    async fn list_tools(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        let catalog = self
            .state
            .catalog
            .lock()
            .map_err(|e| ErrorData::internal_error(e.to_string(), None))?
            .clone();

        Ok(ListToolsResult {
            tools: tools_from_catalog(&catalog),
            ..Default::default()
        })
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, ErrorData> {
        let input = request.arguments.map(Value::Object).unwrap_or(Value::Null);
        bridge_tool_call(&self.app, &self.state, &request.name, input).await
    }
}

/// Build the MCP `tools/list` result from the registered catalog. Pure and
/// independently testable — the only place the JS catalog's `{name, summary,
/// input}` shape is understood.
fn tools_from_catalog(catalog: &[Value]) -> Vec<Tool> {
    catalog
        .iter()
        .filter_map(|entry| {
            let name = entry.get("name")?.as_str()?.to_string();
            let description = entry
                .get("summary")
                .and_then(Value::as_str)
                .map(str::to_string);
            let input_schema = entry
                .get("input")
                .and_then(Value::as_object)
                .cloned()
                .unwrap_or_default();
            Some(Tool::new_with_raw(
                name,
                description.map(Into::into),
                Arc::new(input_schema),
            ))
        })
        .collect()
}

/// Emit `acp://mcp-tool-call` and wait (up to [`TOOL_CALL_TIMEOUT`]) for the
/// webview to answer via `acp_mcp_tool_result`. Split out from `call_tool` so
/// it's testable without an `rmcp` `RequestContext` (which needs a live
/// service connection to construct).
async fn bridge_tool_call<R: Runtime>(
    app: &AppHandle<R>,
    state: &McpBridgeState,
    tool: &str,
    input: Value,
) -> Result<CallToolResult, ErrorData> {
    let request_id = Uuid::new_v4().to_string();
    let (tx, rx) = oneshot::channel();
    {
        let mut pending = state
            .pending_calls
            .lock()
            .map_err(|e| ErrorData::internal_error(e.to_string(), None))?;
        pending.insert(request_id.clone(), tx);
    }

    let _ = app.emit(
        "acp://mcp-tool-call",
        serde_json::json!({ "requestId": request_id, "tool": tool, "input": input }),
    );

    match tokio::time::timeout(TOOL_CALL_TIMEOUT, rx).await {
        Ok(Ok(envelope)) => Ok(envelope_to_result(&envelope)),
        Ok(Err(_)) => Err(ErrorData::internal_error(
            "webview closed without answering the tool call",
            None,
        )),
        Err(_) => {
            state
                .pending_calls
                .lock()
                .ok()
                .and_then(|mut p| p.remove(&request_id));
            Err(ErrorData::internal_error(
                "tool call timed out waiting for the app",
                None,
            ))
        }
    }
}

/// Map the JS `{ok, output}` / `{ok:false, error:{message}}` dispatch envelope
/// (see `core/dispatch.js`) onto an MCP `CallToolResult`.
fn envelope_to_result(envelope: &Value) -> CallToolResult {
    let ok = envelope.get("ok").and_then(Value::as_bool).unwrap_or(false);
    if ok {
        let output = envelope.get("output").cloned().unwrap_or(Value::Null);
        CallToolResult::success(vec![ContentBlock::text(output.to_string())])
    } else {
        let message = envelope
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("tool call failed")
            .to_string();
        CallToolResult::error(vec![ContentBlock::text(message)])
    }
}

/// Replace the registered catalog. Called once when `useAcpAgent()` initializes
/// (and again if the app's catalog changes at runtime).
#[tauri::command]
pub fn acp_register_catalog(
    state: State<'_, Arc<McpBridgeState>>,
    tools: Vec<Value>,
) -> Result<(), String> {
    let mut catalog = state.catalog.lock().map_err(|e| e.to_string())?;
    *catalog = tools;
    Ok(())
}

/// Resolve a pending `tools/call` with the webview's dispatch envelope.
#[tauri::command]
pub fn acp_mcp_tool_result(
    state: State<'_, Arc<McpBridgeState>>,
    request_id: String,
    envelope: Value,
) -> Result<(), String> {
    let sender = {
        let mut pending = state.pending_calls.lock().map_err(|e| e.to_string())?;
        pending.remove(&request_id)
    };
    if let Some(sender) = sender {
        let _ = sender.send(envelope);
    }
    Ok(())
}

/// Start the loopback MCP HTTP server for this app (idempotent per app run —
/// call once at `useAcpAgent()` init) and return its base URL, e.g.
/// `http://127.0.0.1:54321/`, to pass as an `mcpServers` HTTP entry to
/// `acp_spawn_agent`.
#[tauri::command]
pub async fn acp_start_mcp_bridge<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Arc<McpBridgeState>>,
) -> Result<String, String> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
    let addr = listener.local_addr().map_err(|e| e.to_string())?;

    let bridge_state = state.inner().clone();
    let app_for_service = app.clone();
    let service = StreamableHttpService::new(
        move || {
            Ok(CatalogHandler {
                app: app_for_service.clone(),
                state: bridge_state.clone(),
            })
        },
        Arc::new(LocalSessionManager::default()),
        StreamableHttpServerConfig::default(),
    );

    let service = tower::ServiceExt::<axum::http::Request<axum::body::Body>>::map_response(
        service,
        |resp: axum::http::Response<_>| resp.map(axum::body::Body::new),
    );

    tokio::spawn(async move {
        let _ = axum::serve(listener, tower::make::Shared::new(service)).await;
    });

    Ok(format!("http://{addr}/"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn tools_from_catalog_maps_name_summary_input() {
        let catalog = vec![
            json!({ "tier": "read", "name": "workspaces", "summary": "List workspaces", "input": {} }),
            json!({ "tier": "destructive", "name": "remove", "summary": "Delete a task", "input": { "id": { "type": "string", "required": true } } }),
        ];
        let tools = tools_from_catalog(&catalog);
        assert_eq!(tools.len(), 2);
        assert_eq!(tools[0].name, "workspaces");
        assert_eq!(tools[0].description.as_deref(), Some("List workspaces"));
        assert_eq!(tools[1].name, "remove");
        assert!(tools[1].input_schema.contains_key("id"));
    }

    #[test]
    fn tools_from_catalog_skips_entries_without_a_name() {
        let catalog = vec![json!({ "summary": "no name field" })];
        assert!(tools_from_catalog(&catalog).is_empty());
    }

    #[test]
    fn envelope_to_result_maps_ok_and_error() {
        let ok = envelope_to_result(&json!({ "ok": true, "output": "done" }));
        assert_eq!(ok.is_error, Some(false));

        let err = envelope_to_result(
            &json!({ "ok": false, "error": { "code": "forbidden", "message": "nope" } }),
        );
        assert_eq!(err.is_error, Some(true));
    }

    #[tokio::test]
    async fn bridge_tool_call_round_trips_through_the_pending_map() {
        let app = tauri::test::mock_app();
        let state = Arc::new(McpBridgeState::default());

        let call = tokio::spawn({
            let app = app.handle().clone();
            let state = state.clone();
            async move { bridge_tool_call(&app, &state, "remove", json!({ "id": "1" })).await }
        });

        // `bridge_tool_call` inserts into `pending_calls` before it can be
        // observed here — poll briefly instead of racing it.
        let request_id = loop {
            if let Some(id) = state.pending_calls.lock().unwrap().keys().next().cloned() {
                break id;
            }
            tokio::task::yield_now().await;
        };

        // Exactly what `acp_mcp_tool_result` does.
        let sender = state
            .pending_calls
            .lock()
            .unwrap()
            .remove(&request_id)
            .unwrap();
        sender
            .send(json!({ "ok": true, "output": "removed" }))
            .unwrap();

        let result = call.await.unwrap().unwrap();
        assert_eq!(result.is_error, Some(false));
    }

    #[tokio::test]
    async fn bridge_tool_call_errors_when_the_sender_is_dropped() {
        // Simulates the webview going away mid-call: dropping the pending
        // sender resolves the oneshot receiver with an error immediately, so
        // this doesn't need to wait out the real 300s timeout.
        let app = tauri::test::mock_app();
        let state = Arc::new(McpBridgeState::default());

        let call = tokio::spawn({
            let app = app.handle().clone();
            let state = state.clone();
            async move { bridge_tool_call(&app, &state, "remove", json!({})).await }
        });

        let request_id = loop {
            if let Some(id) = state.pending_calls.lock().unwrap().keys().next().cloned() {
                break id;
            }
            tokio::task::yield_now().await;
        };
        state.pending_calls.lock().unwrap().remove(&request_id);

        let result = call.await.unwrap();
        assert!(result.is_err());
    }
}
