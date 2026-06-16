//! Tauri commands exposed by the plugin (invoked as `plugin:agent|<command>`).
//! The journal commands resolve the per-app requests directory from the app's
//! local-data dir; `omlx_config` reads `~/.omlx/settings.json`.

use std::fs;
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

/// omlx config: base URL + api key, so apps don't set them individually. Empty
/// values → `None`.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OmlxConfig {
    base_url: Option<String>,
    model: Option<String>,
    api_key: Option<String>,
}

/// Read `(base_url, api_key)` from `~/.omlx/settings.json` — the same file the
/// omlx server reads. Portable: `$HOME` resolves per machine, so no per-host
/// env/launchd setup. Any read error → `(None, None)`.
fn omlx_from_settings() -> (Option<String>, Option<String>) {
    let Some(home) = std::env::var_os("HOME") else {
        return (None, None);
    };
    let path = PathBuf::from(home).join(".omlx/settings.json");
    let Ok(raw) = fs::read_to_string(&path) else {
        return (None, None);
    };
    let Ok(json) = serde_json::from_str::<Value>(&raw) else {
        return (None, None);
    };
    let str_at = |obj: &str, key: &str| {
        json.get(obj)
            .and_then(|o| o.get(key))
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(str::to_owned)
    };
    let host = str_at("server", "host");
    let port = json
        .get("server")
        .and_then(|s| s.get("port"))
        .and_then(Value::as_u64);
    let base_url = match (host, port) {
        (Some(h), Some(p)) => Some(format!("http://{h}:{p}/v1")),
        _ => None,
    };
    (base_url, str_at("auth", "api_key"))
}

#[tauri::command]
pub fn omlx_config() -> OmlxConfig {
    let (base_url, api_key) = omlx_from_settings();
    OmlxConfig {
        base_url,
        model: None,
        api_key,
    }
}
