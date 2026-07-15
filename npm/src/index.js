// `@7n/tauri-components` — core (no Vue). The agent loop, tool surface and the
// kit that binds them to an app catalog. Import this entry from headless
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
  startAcpMcpBridge,
} from './core/acp-agent.js'
export { createAcpAgentKit } from './core/acp-kit.js'
export { createAgentKit } from './core/agent-kit.js'
export { handleApprove, handleRequest, handleRespond } from './core/agent-handler.js'
export { createDispatch, validateInput } from './core/dispatch.js'
export { createOpenAiChat, runAgent } from './core/llm.js'
export { listOmlxModels, resolveModel } from './core/omlx-models.js'
export { DIRECT_OMLX_BASE_URL, isDirectOmlxUrl, PROXY_OMLX_BASE_URL, resolveOmlxBaseUrl, resolveOmlxBaseUrlCached } from './core/resolve-omlx-base-url.js'
export { listTools, toJsonSchema, toolManifest } from './core/manifest.js'
export { classify, DEFAULT_ACTOR_TIERS, scopedManifest, scopedToolNames } from './core/scope.js'
export { getTool } from './core/tools.js'
