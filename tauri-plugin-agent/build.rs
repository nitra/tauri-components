// Generate the per-command permission files (allow-/deny-<command>) and the
// plugin's permission schema so consumer apps can grant `agent:default`.
const COMMANDS: &[&str] = &[
    "journal_create",
    "journal_load",
    "journal_update",
    "journal_list",
    "omlx_config",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
