// `@7n/tauri-components` — core (no Vue). The ACP agent kit and the tool
// surface it binds to an app catalog. Import this entry from headless
// consumers (CLI orchestrators, MCP wrappers); the Vue/Quasar layers live under
// the ./vue and ./components subpaths.

export {
  acpConfig,
  cancelAcpSession,
  createAcpSession,
  onAcpPermissionRequest,
  onAcpToolCall,
  respondAcpPermission,
  respondAcpToolCall,
  runAcpTurn,
  startAcpMcpBridge
} from './core/acp-agent.js'
export { CODEX_ACP_AGENT_PRESET } from './core/acp-agent-presets.js'
export { createAcpAgentKit } from './core/acp-kit.js'
export { createDispatch, validateInput } from './core/dispatch.js'
export { listTools, toJsonSchema, toolManifest } from './core/manifest.js'
export { classify, DEFAULT_ACTOR_TIERS, scopedManifest, scopedToolNames } from './core/scope.js'
export { getTool } from './core/tools.js'
