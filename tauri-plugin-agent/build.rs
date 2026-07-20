// Generate the per-command permission files (allow-/deny-<command>) and the
// plugin's permission schema so consumer apps can grant `agent:default`.
const COMMANDS: &[&str] = &[
    "journal_create",
    "journal_load",
    "journal_update",
    "journal_list",
    "acp_spawn_agent",
    "acp_prompt",
    "acp_cancel",
    "acp_respond_permission",
    "acp_config",
    "acp_register_catalog",
    "acp_mcp_tool_result",
    "acp_start_mcp_bridge",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
