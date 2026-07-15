//! `tauri-plugin-agent` — the Rust half of `@7n/tauri-components`.
//!
//! Registers the per-app request journal (`journal_*`) and `omlx_config`
//! commands so every consumer app shares one implementation. Commands are
//! invoked from the webview as `plugin:agent|<command>` (the JS package's
//! `createTauriJournalStore` / `useOmlx` use exactly those names).
//!
//! Register in an app's builder:
//! ```ignore
//! tauri::Builder::default()
//!     .plugin(tauri_plugin_agent::init())
//! ```
//! and grant `agent:default` in the app's capability file.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod acp;
mod commands;
mod journal;
mod mcp_bridge;

/// Initialize the agent plugin: journal + omlx commands, the ACP client
/// commands (spawning/prompting/cancelling an external coding agent and
/// resolving its permission requests), and the domain MCP bridge (exposes the
/// app's tool catalog to whichever ACP agent is spawned).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("agent")
        .invoke_handler(tauri::generate_handler![
            commands::journal_create,
            commands::journal_load,
            commands::journal_update,
            commands::journal_list,
            commands::omlx_config,
            acp::acp_spawn_agent,
            acp::acp_prompt,
            acp::acp_cancel,
            acp::acp_respond_permission,
            acp::acp_config,
            mcp_bridge::acp_register_catalog,
            mcp_bridge::acp_mcp_tool_result,
            mcp_bridge::acp_start_mcp_bridge,
        ])
        .setup(|app, _api| {
            app.manage(acp::AcpState::default());
            app.manage(std::sync::Arc::new(mcp_bridge::McpBridgeState::default()));
            Ok(())
        })
        .build()
}
