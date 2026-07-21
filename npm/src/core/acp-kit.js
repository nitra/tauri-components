import * as acpAgent from './acp-agent.js'
import { createDispatch } from './dispatch.js'
import { classify, DEFAULT_ACTOR_TIERS } from './scope.js'

// createAcpAgentKit binds an app's catalog + journal to the ACP execution
// engine — the sole agent kit (the earlier omlx/runAgent-based createAgentKit
// has been removed; see CHANGELOG).
//
// The ACP agent process drives its OWN tool-calling loop and calls domain
// tools through the Rust-side MCP bridge — so dispatch is triggered by a
// STANDING listener on `acp://mcp-tool-call`, not by anything in
// request()/respond(). Every such call is tier-classified as an
// `{kind:'agent'}` actor, since by construction only an autonomous agent
// process can reach the bridge.
//
// Scope: one active session/request at a time, matching how AgentDialog is
// actually used today (a single live conversation). A tool call or permission
// request always attaches its `needs_approval` state to whichever journal
// request is currently active — concurrent sessions would need per-session
// routing, which isn't attempted here.

const AGENT_ACTOR = { kind: 'agent', id: 'acp' }
const QUESTION_RE = /\?\s*$/

/**
 * @param {string} text candidate text
 * @returns {boolean} true when text ends with a question mark
 */
function isQuestion(text) {
  return typeof text === 'string' && QUESTION_RE.test(text.trim())
}

/**
 * Derive the structured result fields from a runAcpTurn() result.
 * @param {{content: string, stopped?: string}} turn runAcpTurn result
 * @returns {{status: string, summary: string|null, question: string|null}} fields
 */
function finalizeTurn(turn) {
  const question = isQuestion(turn.content) ? turn.content : null
  let status = 'done'
  if (turn.stopped === 'max_steps' || turn.stopped === 'refusal') status = 'partial'
  else if (turn.stopped === 'cancelled') status = 'partial'
  else if (question) status = 'needs_clarification'
  return { status, summary: question ? null : turn.content || null, question }
}

/**
 * @param {object} config kit configuration
 * @param {object[]} config.catalog tool definitions (required)
 * @param {object} config.journal journal store { create, load, update, list }
 * @param {(tool: object, input: object) => unknown} [config.transport] backend runner for domain tools; omit for a chat-only kit (no domain MCP tools)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {object} [config.deps] injectable `acp-agent.js` functions (tests only — defaults to the real module)
 * @returns {{request: (opts: {intent: string, agent: object}) => Promise<object>, respond: (opts: {requestId: string, message: string}) => Promise<object>, approve: (opts: {requestId: string, approve: boolean}) => Promise<object>}} bound kit
 */
export function createAcpAgentKit({
  catalog,
  journal,
  transport,
  actorTiers = DEFAULT_ACTOR_TIERS,
  deps = acpAgent
} = {}) {
  if (!Array.isArray(catalog)) throw new Error('createAcpAgentKit: catalog (array) is required')

  const dispatch = transport ? createDispatch(catalog, transport) : null
  let activeSessionKey = null
  let activeRequestId = null
  let listening = false

  /**
   * Resolve one pending MCP tools/call per the tier decision. Called once per
   * `acp://mcp-tool-call` event.
   * @param {{requestId: string, tool: string, input: object}} payload event payload
   * @returns {Promise<void>} resolves once the bridge has an answer
   */
  async function handleToolCall({ requestId, tool, input }) {
    if (!dispatch) {
      await deps.respondAcpToolCall(requestId, {
        ok: false,
        error: { code: 'forbidden', message: 'No transport configured.' }
      })
      return
    }
    const decision = classify(catalog, actorTiers, AGENT_ACTOR, tool)
    if (decision === 'deny') {
      await deps.respondAcpToolCall(requestId, {
        ok: false,
        error: { code: 'forbidden', message: `Tool "${tool}" is not allowed.` }
      })
      return
    }
    if (decision === 'approval') {
      if (activeRequestId) {
        await journal.update(activeRequestId, {
          status: 'needs_approval',
          pendingApproval: { kind: 'mcp', requestId, tool, input }
        })
      }
      return // acp_mcp_tool_result comes later, from approve()
    }
    await deps.respondAcpToolCall(requestId, await dispatch(tool, input))
  }

  /**
   * Mirror a native ACP `session/request_permission` into the same
   * `pendingApproval` shape as an MCP tool-call pause, so `AuditDialog` only
   * has to understand one contract.
   * @param {{requestId: string, toolCall: object, options: {optionId: string, name: string, kind: string}[]}} payload event payload
   * @returns {Promise<void>} resolves once the journal is updated
   */
  async function handlePermissionRequest(payload) {
    if (!activeRequestId) return
    await journal.update(activeRequestId, { status: 'needs_approval', pendingApproval: { kind: 'acp', ...payload } })
  }

  /**
   * Start listening for domain tool calls and native permission requests —
   * lazy, once per kit, since it applies to every session this kit drives.
   * @returns {Promise<void>} resolves once both listeners are attached
   */
  async function ensureListening() {
    if (listening) return
    listening = true
    await deps.onAcpToolCall(handleToolCall)
    await deps.onAcpPermissionRequest(handlePermissionRequest)
  }

  /**
   * Journal a request as failed and return its structured result envelope —
   * shared by a session that never spawned and a turn that errored mid-flight.
   * @param {string} requestId journal record id
   * @param {object[]} baseActions actions already recorded for this request
   * @param {unknown} error the thrown/rejected value
   * @returns {Promise<object>} structured result envelope
   */
  async function failedResult(requestId, baseActions, error) {
    const message = String(error?.message ?? error)
    await journal.update(requestId, { status: 'failed', error: message })
    return {
      requestId,
      status: 'failed',
      summary: null,
      error: message,
      actions: baseActions,
      question: null,
      pendingApproval: null
    }
  }

  /**
   * Run one turn, journal the result, and reset `pendingApproval`. Callers
   * must set `activeRequestId` themselves *before* starting the turn — a
   * tool-call/permission-request can arrive (and needs to see the right id)
   * while the turn's own promise is still pending, so setting it here as a
   * side effect of awaiting would be too late.
   * @param {string} requestId journal record id
   * @param {object[]} baseActions actions already recorded for this request
   * @param {Promise<object>} turnPromise the in-flight `runAcpTurn` call
   * @returns {Promise<object>} structured result envelope
   */
  async function runAndJournal(requestId, baseActions, turnPromise) {
    let turn
    try {
      turn = await turnPromise
    } catch (error) {
      return failedResult(requestId, baseActions, error)
    }
    const fields = finalizeTurn(turn)
    const actions = [...baseActions, ...turn.trace]
    await journal.update(requestId, { ...fields, messages: turn.messages, actions, pendingApproval: null })
    return { requestId, ...fields, actions, pendingApproval: null }
  }

  return {
    /**
     * Start a new ACP-backed request: spawns the agent session and runs the
     * first prompt turn.
     * @param {{intent: string, agent: object, onChunk?: (snapshot: {text: string, actions: object[]}) => void}} opts `agent` is passed straight to `createAcpSession` (agentKind/command/args/env/cwd/…); `onChunk` streams live text/tool-calls as the turn runs
     * @returns {Promise<object>} structured result envelope
     */
    async request({ intent, agent, onChunk }) {
      await ensureListening()
      const id = await journal.create({ intent, actor: AGENT_ACTOR })
      await journal.update(id, { status: 'running' })
      let session
      try {
        session = await deps.createAcpSession(agent)
      } catch (error) {
        return failedResult(id, [], error)
      }
      activeSessionKey = session.sessionKey
      activeRequestId = id
      await journal.update(id, { acp: { agentKind: session.agentKind, sessionKey: session.sessionKey } })
      return runAndJournal(id, [], deps.runAcpTurn({ sessionKey: activeSessionKey, text: intent, onChunk }))
    },

    /**
     * Continue the active session with a follow-up message.
     * @param {{requestId: string, message: string, onChunk?: (snapshot: {text: string, actions: object[]}) => void}} opts resume parameters; `onChunk` streams live text/tool-calls as the turn runs
     * @returns {Promise<object>} updated result envelope
     */
    async respond({ requestId, message, onChunk }) {
      if (!activeSessionKey) {
        return {
          requestId,
          status: 'failed',
          summary: null,
          actions: [],
          question: 'No active ACP session.',
          pendingApproval: null
        }
      }
      let record
      try {
        record = await journal.load(requestId)
      } catch {
        return {
          requestId,
          status: 'failed',
          summary: null,
          actions: [],
          question: 'Request not found.',
          pendingApproval: null
        }
      }
      await journal.update(requestId, { status: 'running' })
      activeRequestId = requestId
      return runAndJournal(
        requestId,
        record.actions ?? [],
        deps.runAcpTurn({ sessionKey: activeSessionKey, text: message, onChunk })
      )
    },

    /**
     * Resolve a pending approval — either an MCP domain-tool call or a native
     * ACP permission request, whichever is attached to this journal record.
     * @param {{requestId: string, approve: boolean}} opts approval parameters
     * @returns {Promise<object>} updated result envelope
     */
    async approve({ requestId, approve: decision }) {
      let record
      try {
        record = await journal.load(requestId)
      } catch {
        return {
          requestId,
          status: 'failed',
          summary: null,
          actions: [],
          question: 'Request not found.',
          pendingApproval: null
        }
      }

      const pending = record.pendingApproval
      if (record.status !== 'needs_approval' || !pending) {
        return {
          requestId,
          status: record.status,
          summary: record.summary,
          actions: record.actions ?? [],
          question: null,
          pendingApproval: null
        }
      }

      if (pending.kind === 'acp') return approveAcpPermission(deps, journal, requestId, record, pending, decision)
      return approveMcpToolCall(deps, dispatch, journal, requestId, record, pending, decision)
    }
  }
}

/**
 * Resolve a pending MCP domain-tool call (reject with a forbidden envelope,
 * or dispatch and forward the real envelope) and unblock the agent.
 *
 * Deliberately does **not** declare a terminal `done`/`rejected` status: once
 * we reply to the agent's `tools/call`, its turn keeps running in the
 * background — the in-flight `request()`/`respond()` call's `runAndJournal`
 * is the only thing that will observe how the turn actually concludes (it
 * may make more tool calls, or answer differently than a flat "done" would
 * suggest), so it's the sole writer of the final journal state. This also
 * means the old "retry a failed dispatch" UX doesn't carry over: once the
 * agent has been told a tool call failed, it has already moved on.
 * @param {object} deps injected acp-agent.js functions
 * @param {(name: string, input?: object) => Promise<object>} dispatch bound `createDispatch` result
 * @param {object} journal journal store
 * @param {string} requestId journal record id
 * @param {object} record loaded journal record
 * @param {{requestId: string, tool: string, input: object}} pending the paused MCP call
 * @param {boolean} decision approve (true) or reject (false)
 * @returns {Promise<object>} immediate (non-terminal) result envelope
 */
async function approveMcpToolCall(deps, dispatch, journal, requestId, record, pending, decision) {
  const envelope = decision
    ? await dispatch(pending.tool, pending.input)
    : { ok: false, error: { code: 'forbidden', message: 'Rejected by human.' } }
  await deps.respondAcpToolCall(pending.requestId, envelope)

  const actions = [...(record.actions ?? []), { tool: pending.tool, input: pending.input, envelope }]
  await journal.update(requestId, { status: 'running', actions, pendingApproval: null })
  return { requestId, status: 'running', summary: null, actions, question: null, pendingApproval: null }
}

/**
 * Resolve a native ACP `session/request_permission` by selecting the
 * matching allow/reject option (`kind` from `PermissionOptionView`, see
 * `tauri-plugin-agent/src/acp/mod.rs`) and unblock the agent. Falls back to
 * the first option if none of the requested kind is offered. Same
 * non-terminal-status rule as `approveMcpToolCall` — the agent's turn is
 * still running.
 * @param {object} deps injected acp-agent.js functions
 * @param {object} journal journal store
 * @param {string} requestId journal record id
 * @param {object} record loaded journal record
 * @param {{requestId: string, options: {optionId: string, kind: string}[]}} pending the paused permission request
 * @param {boolean} decision approve (true) or reject (false)
 * @returns {Promise<object>} immediate (non-terminal) result envelope
 */
async function approveAcpPermission(deps, journal, requestId, record, pending, decision) {
  const wantPrefix = decision ? 'allow' : 'reject'
  const option = pending.options?.find(o => o.kind?.startsWith(wantPrefix)) ?? pending.options?.[0]
  await deps.respondAcpPermission(pending.requestId, option?.optionId)

  await journal.update(requestId, { status: 'running', pendingApproval: null })
  return {
    requestId,
    status: 'running',
    summary: null,
    actions: record.actions ?? [],
    question: null,
    pendingApproval: null
  }
}
