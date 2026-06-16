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
    Runtime,
};

mod commands;
mod journal;

/// Initialize the agent plugin (journal + omlx commands).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("agent")
        .invoke_handler(tauri::generate_handler![
            commands::journal_create,
            commands::journal_load,
            commands::journal_update,
            commands::journal_list,
            commands::omlx_config,
        ])
        .build()
}
