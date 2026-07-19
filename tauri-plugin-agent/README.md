# tauri-plugin-agent

The Rust half of [`@7n/tauri-components`](../npm). Ships the Tauri commands the
shared agent UI needs, so every consumer app (`task`, `mlmail`, `myshare`) gets
one implementation instead of copying them into each `src-tauri/lib.rs`:

- `journal_create` / `journal_load` / `journal_update` / `journal_list` — the
  per-file request journal (`<app-local-data>/requests/<id>.json`). The
  directory is resolved from the app's own local-data dir, so each app keeps an
  isolated journal with no hardcoded bundle id (override with
  `AGENT_REQUESTS_DIR`).
- ACP client commands (`acp_spawn_agent`, `acp_prompt`, `acp_cancel`,
  `acp_respond_permission`, `acp_config`) and the domain MCP bridge
  (`acp_register_catalog`, `acp_mcp_tool_result`, `acp_start_mcp_bridge`) —
  spawn/drive an external coding agent (codex/claude/cursor/pi) and expose the
  app's tool catalog to it.

Commands are invoked from the webview as `plugin:agent|<command>`, which is
exactly what the JS package's `createTauriJournalStore` and `useAcpAgent` call.

## Use it in an app

`Cargo.toml` (git dependency — not published to crates.io):

```toml
[dependencies]
tauri-plugin-agent = { git = "https://github.com/nitra/tauri-components" }
```

`src-tauri/src/lib.rs`:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_agent::init())
    // … your domain commands (scan_tasks, create_task, …) stay app-level
```

Capability file (e.g. `src-tauri/capabilities/default.json`):

```json
{
  "permissions": ["agent:default"]
}
```

`agent:default` grants the four journal commands. Grant individual
`agent:allow-<command>` permissions instead if an app needs a narrower surface.

## Scope

Only journal + ACP client + domain MCP bridge live here — they are identical
across apps. Domain tools (scanning a task tree, sending mail, …) stay in each
app's `src-tauri`, declared in the app's JS tool catalog and dispatched via
`tauriTransport`.
