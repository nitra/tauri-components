import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ACP session driver: instead of running our own chat-completion loop, we
// spawn an external ACP agent (codex-acp/claude-agent-acp/cursor `agent acp`/
// pi-acp) via the Rust plugin's acp_* commands and stream its `session/update`
// notifications back into a {content, trace, messages, stopped?} shape that
// acp-kit.js's runAndJournal folds straight into the journal.
//
// Domain-tool approval (the MCP bridge's `acp://mcp-tool-call`) and native ACP
// permission requests (`acp://permission-request`) are separate event streams
// callers subscribe to independently — see onAcpToolCall / onAcpPermissionRequest.
// While either is pending, the underlying acp_prompt Tauri call simply stays
// unresolved (the agent's tools/call HTTP request is parked on the Rust side),
// so the turn transparently continues once the human answers.

/**
 * Spawn an ACP agent subprocess and run its `initialize` + `session/new`
 * handshake. Returns a session handle to pass to `runAcpTurn`/`cancelAcpSession`.
 * @param {object} params spawn parameters
 * @param {string} params.agentKind 'codex'|'claude'|'cursor'|'pi' (informational — passed through, not interpreted here)
 * @param {string} params.command executable to spawn (e.g. 'npx')
 * @param {string[]} [params.args] command arguments
 * @param {Record<string,string>} [params.env] extra environment variables for the subprocess
 * @param {string} params.cwd session working directory (absolute path)
 * @param {string} [params.mcpBridgeUrl] this app's domain MCP bridge URL (from acpStartMcpBridge), omit for no domain tools
 * @param {boolean} [params.allowFs] grant fs/read_text_file + fs/write_text_file
 * @param {boolean} [params.allowTerminal] grant terminal/*
 * @returns {Promise<{sessionKey: string, agentKind: string}>} session handle
 */
export async function createAcpSession({
  agentKind,
  command,
  args = [],
  env = {},
  cwd,
  mcpBridgeUrl,
  allowFs = false,
  allowTerminal = false
}) {
  const sessionKey = await invoke('plugin:agent|acp_spawn_agent', {
    args: { command, args, env, cwd, mcpBridgeUrl, allowFs, allowTerminal }
  })
  return { sessionKey, agentKind }
}

/**
 * Map an ACP `stopReason` onto the `stopped` field runAgent() used to return
 * (undefined means "ended normally", matching the old no-tool-call exit).
 * @param {string} stopReason ACP PromptResponse.stopReason
 * @returns {string|undefined} runAgent()-shaped stopped reason
 */
function stoppedFromStopReason(stopReason) {
  if (stopReason === 'end_turn') return
  if (stopReason === 'cancelled') return 'cancelled'
  if (stopReason === 'refusal') return 'refusal'
  return 'max_steps' // max_tokens / max_turn_requests / anything unrecognized
}

/**
 * Fold one `session/update` payload into the turn's running content/trace.
 * @param {object} state mutable accumulator ({ text, messageId, calls: Map })
 * @param {object} update the ACP SessionUpdate (already unwrapped from the event payload)
 * @returns {void}
 */
function applySessionUpdate(state, update) {
  switch (update?.sessionUpdate) {
    case 'agent_message_chunk': {
      if (update.messageId !== state.messageId) {
        state.messageId = update.messageId
        state.text = ''
      }
      state.text += update.content?.text ?? ''
      break
    }
    case 'tool_call': {
      state.calls.set(update.toolCallId, {
        tool: update.title ?? update.toolCallId,
        input: update.rawInput ?? {},
        envelope: null
      })
      break
    }
    case 'tool_call_update': {
      const call = state.calls.get(update.toolCallId)
      const fields = update.fields ?? {}
      if (call && fields.rawOutput !== undefined) {
        call.envelope = { ok: fields.status !== 'failed', output: fields.rawOutput }
      }
      break
    }
    default: {
      break
    }
  }
}

/**
 * Run one prompt turn on an already-spawned ACP session, streaming
 * `session/update` chunks into the same shape `runAgent()` returned.
 * @param {object} params turn parameters
 * @param {string} params.sessionKey handle from `createAcpSession`
 * @param {string} params.text prompt text for this turn
 * @param {(snapshot: {text: string, actions: {tool: string, input: object, envelope: object|null}[]}) => void} [params.onChunk] optional live callback with the turn's accumulated text/tool-calls so far, fired on every session/update (UI streaming)
 * @returns {Promise<{content: string, steps: number, trace: object[], messages: object[], stopped?: string}>} runAgent()-shaped result
 */
export async function runAcpTurn({ sessionKey, text, onChunk }) {
  const state = { text: '', messageId: null, calls: new Map() }

  const unlisten = await listen('acp://session-update', event => {
    if (event.payload?.sessionKey !== sessionKey) return
    applySessionUpdate(state, event.payload.update)
    onChunk?.({ text: state.text, actions: state.calls.values().toArray() })
  })

  try {
    const stopReason = await invoke('plugin:agent|acp_prompt', { sessionKey, text })
    const trace = [...state.calls.values()]
    const messages = state.text ? [{ role: 'assistant', content: state.text }] : []
    return {
      content: state.text,
      steps: 1,
      trace,
      messages,
      stopped: stoppedFromStopReason(stopReason)
    }
  } finally {
    unlisten()
  }
}

/**
 * Ask the agent to cancel its in-flight prompt turn.
 * @param {string} sessionKey handle from `createAcpSession`
 * @returns {Promise<void>} resolves once the cancel notification is sent
 */
export function cancelAcpSession(sessionKey) {
  return invoke('plugin:agent|acp_cancel', { sessionKey })
}

/**
 * Subscribe to `acp://mcp-tool-call` (a domain-catalog tool call the agent
 * made through the MCP bridge, waiting on `acp_mcp_tool_result`).
 * @param {(payload: {requestId: string, tool: string, input: object}) => void} handler callback
 * @returns {Promise<() => void>} unlisten function
 */
export function onAcpToolCall(handler) {
  return listen('acp://mcp-tool-call', event => handler(event.payload))
}

/**
 * Resolve a pending `acp://mcp-tool-call` with the same envelope shape
 * `createDispatch` returns.
 * @param {string} requestId id from the `acp://mcp-tool-call` payload
 * @param {{ok: boolean, output?: unknown, error?: {code: string, message: string}}} envelope dispatch result
 * @returns {Promise<void>} resolves once the reply reaches the Rust bridge
 */
export function respondAcpToolCall(requestId, envelope) {
  return invoke('plugin:agent|acp_mcp_tool_result', { requestId, envelope })
}

/**
 * Subscribe to `acp://permission-request` (a native ACP `session/request_permission`
 * call, e.g. the agent's own file-edit/bash tools asking before running).
 * @param {(payload: {sessionKey: string, requestId: string, toolCall: object, options: {optionId: string, name: string}[]}) => void} handler callback
 * @returns {Promise<() => void>} unlisten function
 */
export function onAcpPermissionRequest(handler) {
  return listen('acp://permission-request', event => handler(event.payload))
}

/**
 * Resolve a pending `acp://permission-request` by selecting one of its options.
 * @param {string} requestId id from the `acp://permission-request` payload
 * @param {string} optionId one of the payload's `options[].optionId`
 * @returns {Promise<void>} resolves once the permission response is sent
 */
export function respondAcpPermission(requestId, optionId) {
  return invoke('plugin:agent|acp_respond_permission', { requestId, optionId })
}

/**
 * Register this app's tool catalog with the domain MCP bridge and start it.
 * @param {object[]} catalog tool definitions (same shape passed to `createAcpAgentKit`)
 * @returns {Promise<string>} the bridge's loopback URL, e.g. `http://127.0.0.1:54321/`
 */
export async function startAcpMcpBridge(catalog) {
  await invoke('plugin:agent|acp_register_catalog', { tools: catalog })
  return invoke('plugin:agent|acp_start_mcp_bridge')
}

/**
 * Read the per-machine default agent kind (`ACP_DEFAULT_AGENT` env var).
 * @returns {Promise<{defaultAgentKind: string|null}>} config
 */
export function acpConfig() {
  return invoke('plugin:agent|acp_config')
}
