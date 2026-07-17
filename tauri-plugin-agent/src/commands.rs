//! Tauri commands exposed by the plugin (invoked as `plugin:agent|<command>`).
//! The journal commands resolve the per-app requests directory from the app's
//! local-data dir.

use std::path::PathBuf;

use serde_json::Value;
use tauri::{AppHandle, Manager, Runtime};

use crate::journal;

/// Resolve the requests directory: `AGENT_REQUESTS_DIR` override, else the app's
/// own local-data dir + `/requests`. Using the app handle means each consumer
/// app (com.nitra.task, com.vitaliytv.mlmail, …) gets an isolated journal with
/// no hardcoded bundle id.
fn requests_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    if let Some(dir) = std::env::var_os("AGENT_REQUESTS_DIR") {
        return Ok(PathBuf::from(dir));
    }
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("requests"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn journal_create<R: Runtime>(
    app: AppHandle<R>,
    intent: String,
    actor: Value,
) -> Result<String, String> {
    journal::create_in(&requests_dir(&app)?, intent, actor)
}

#[tauri::command]
pub fn journal_load<R: Runtime>(app: AppHandle<R>, id: String) -> Result<Value, String> {
    journal::load_in(&requests_dir(&app)?, &id)
}

#[tauri::command]
pub fn journal_update<R: Runtime>(
    app: AppHandle<R>,
    id: String,
    patch: Value,
) -> Result<(), String> {
    journal::update_in(&requests_dir(&app)?, &id, patch)
}

#[tauri::command]
pub fn journal_list<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Value>, String> {
    journal::list_in(&requests_dir(&app)?)
}
