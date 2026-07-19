// `@7n/tauri-components/vue` — Vue + Tauri composables. Wires the core ACP
// agent kit to the webview (spawns codex/claude/cursor/pi via Tauri invoke,
// tools/journal over Tauri invoke). Requires the host app to provide vue +
// @tauri-apps/* (peer deps) and the tauri-plugin-agent backend commands.

export { useAcpAgent } from './use-acp-agent.js'
export { useUpdater } from './use-updater.js'
export { createTauriJournalStore } from './journal-store-tauri.js'
export { tauriTransport } from './transports.js'
