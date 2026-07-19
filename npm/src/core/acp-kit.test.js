import { describe, expect, it } from 'vitest'
import { setTimeout } from 'node:timers/promises'
import { createAcpAgentKit } from './acp-kit.js'

// Same catalog shape as agent-kit.test.js (read/write/destructive tiers).
const catalog = [
  { tier: 'read', name: 'workspaces', summary: 'list workspaces', input: {}, tauri: 'find_ws' },
  {
    tier: 'write',
    name: 'create',
    summary: 'create a node',
    input: { name: { type: 'string', required: true } },
    tauri: 'create_cmd'
  },
  {
    tier: 'destructive',
    name: 'remove',
    summary: 'remove a node',
    input: { name: { type: 'string', required: true } },
    tauri: 'remove_cmd'
  }
]

/** In-memory journal store matching the injected contract (same as agent-kit.test.js). */
function fakeJournal() {
  const store = new Map()
  let n = 0
  return {
    store,
    create: ({ intent, actor }) => {
      const id = `r${++n}`
      store.set(id, { id, intent, actor, status: 'pending', actions: [] })
      return Promise.resolve(id)
    },
    load: id => (store.has(id) ? Promise.resolve({ ...store.get(id) }) : Promise.reject(new Error('not found'))),
    update: (id, patch) => {
      store.set(id, { ...store.get(id), ...patch })
      return Promise.resolve()
    },
    list: () => Promise.resolve([...store.values()])
  }
}

/**
 * Transport that echoes which tool ran (records calls for assertions).
 * @param calls
 */
function fakeTransport(calls) {
  return (tool, input) => {
    calls.push({ name: tool.name, input })
    return `${tool.name}:done`
  }
}

/**
 * Let every pending microtask (the chain of awaits between `kit.request()`
 * firing and a mid-turn tool-call/permission-request handler's journal write
 * landing) drain before inspecting state — a macrotask tick is robust to
 * exactly how many awaits are in that chain, unlike counting `Promise.resolve()`.
 * @returns {Promise<void>} resolves after the microtask queue is empty
 */
async function flushMicrotasks() {
  await setTimeout(0)
}

/**
 * Fake `acp-agent.js`. Captures the two standing listeners so a test can fire
 * them like a real `acp://mcp-tool-call`/`acp://permission-request` event
 * would. `waitForToolCallReply` mirrors the real blocking behavior: in the
 * real system, the agent's turn only continues once `acp_mcp_tool_result`
 * reaches the Rust bridge and unblocks the agent's own `tools/call` HTTP
 * request — so a `runAcpTurn` mock that calls a tool must await this before
 * it may resolve, exactly like the real `acp_prompt` invoke() would still be
 * pending in that window.
 */
function fakeAcpDeps() {
  let toolCallHandler = null
  let permissionHandler = null
  const respondedToolCalls = []
  const respondedPermissions = []
  const toolCallWaiters = new Map()

  /**
   *
   * @param requestId
   */
  function waiterFor(requestId) {
    if (!toolCallWaiters.has(requestId)) {
      let resolve
      const promise = new Promise(res => {
        resolve = res
      })
      toolCallWaiters.set(requestId, { promise, resolve })
    }
    return toolCallWaiters.get(requestId)
  }

  return {
    respondedToolCalls,
    respondedPermissions,
    waitForToolCallReply: requestId => waiterFor(requestId).promise,
    deps: {
      createAcpSession: async agent => ({ sessionKey: 's1', agentKind: agent.agentKind }),
      runAcpTurn: async () => ({ content: '', trace: [], messages: [], stopped: undefined }),
      onAcpToolCall: async handler => {
        toolCallHandler = handler
      },
      onAcpPermissionRequest: async handler => {
        permissionHandler = handler
      },
      respondAcpToolCall: async (requestId, envelope) => {
        respondedToolCalls.push({ requestId, envelope })
        waiterFor(requestId).resolve(envelope)
      },
      respondAcpPermission: async (requestId, optionId) => {
        respondedPermissions.push({ requestId, optionId })
      }
    },
    emitToolCall: payload => toolCallHandler(payload),
    emitPermissionRequest: payload => permissionHandler(payload)
  }
}

describe('createAcpAgentKit', () => {
  it('throws without a catalog', () => {
    expect(() => createAcpAgentKit({})).toThrow(/catalog/)
  })

  it('runs a request, dispatches an allowed tool call mid-turn, and journals a done result', async () => {
    const calls = []
    const journal = fakeJournal()
    const { deps, emitToolCall, respondedToolCalls } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport(calls), deps })

    deps.runAcpTurn = async () => {
      await emitToolCall({ requestId: 'mcp-1', tool: 'create', input: { name: 'x' } })
      return {
        content: 'Created x.',
        trace: [{ tool: 'create', input: { name: 'x' }, envelope: { ok: true, output: 'create:done' } }],
        messages: [],
        stopped: undefined
      }
    }

    const res = await kit.request({ intent: 'create x', agent: { agentKind: 'codex' } })

    expect(res.status).toBe('done')
    expect(res.summary).toBe('Created x.')
    expect(calls).toEqual([{ name: 'create', input: { name: 'x' } }])
    expect(respondedToolCalls).toEqual([{ requestId: 'mcp-1', envelope: { ok: true, output: 'create:done' } }])
  })

  it('pauses a destructive MCP tool call as needs_approval, and only dispatches once approved', async () => {
    const calls = []
    const journal = fakeJournal()
    const { deps, emitToolCall, waitForToolCallReply, respondedToolCalls } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport(calls), deps })

    deps.runAcpTurn = async () => {
      await emitToolCall({ requestId: 'mcp-1', tool: 'remove', input: { name: 'old' } })
      // Mirrors the real system: the agent's turn stays blocked until the
      // pending tool call is answered — see `waitForToolCallReply` above.
      const envelope = await waitForToolCallReply('mcp-1')
      return {
        content: 'Removed old.',
        trace: [{ tool: 'remove', input: { name: 'old' }, envelope }],
        messages: [],
        stopped: undefined
      }
    }

    const requestPromise = kit.request({ intent: 'remove old', agent: { agentKind: 'codex' } })
    // Let the "tool call arrived" microtasks settle without waiting for the
    // still-blocked turn to finish.
    await flushMicrotasks()

    const [pendingId] = [...journal.store.keys()]
    expect(journal.store.get(pendingId).status).toBe('needs_approval')
    expect(journal.store.get(pendingId).pendingApproval).toEqual({
      kind: 'mcp',
      requestId: 'mcp-1',
      tool: 'remove',
      input: { name: 'old' }
    })
    expect(calls).toEqual([]) // never dispatched while pending

    const approveResult = await kit.approve({ requestId: pendingId, approve: true })
    expect(approveResult.status).toBe('running') // optimistic — the turn is still in flight
    expect(calls).toEqual([{ name: 'remove', input: { name: 'old' } }])
    expect(respondedToolCalls).toEqual([{ requestId: 'mcp-1', envelope: { ok: true, output: 'remove:done' } }])

    const finalResult = await requestPromise
    expect(finalResult.status).toBe('done')
    expect(finalResult.summary).toBe('Removed old.')
  })

  it('rejects a pending MCP action without ever dispatching it', async () => {
    const calls = []
    const journal = fakeJournal()
    const { deps, emitToolCall, waitForToolCallReply, respondedToolCalls } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport(calls), deps })

    deps.runAcpTurn = async () => {
      await emitToolCall({ requestId: 'mcp-1', tool: 'remove', input: { name: 'old' } })
      const envelope = await waitForToolCallReply('mcp-1')
      return {
        content: envelope.ok ? 'Removed.' : 'I could not remove it.',
        trace: [],
        messages: [],
        stopped: undefined
      }
    }

    const requestPromise = kit.request({ intent: 'remove old', agent: { agentKind: 'codex' } })
    await flushMicrotasks()
    const [pendingId] = [...journal.store.keys()]

    const approveResult = await kit.approve({ requestId: pendingId, approve: false })

    expect(approveResult.status).toBe('running')
    expect(calls).toEqual([])
    expect(respondedToolCalls).toEqual([
      { requestId: 'mcp-1', envelope: { ok: false, error: { code: 'forbidden', message: 'Rejected by human.' } } }
    ])

    const finalResult = await requestPromise
    expect(finalResult.summary).toBe('I could not remove it.')
  })

  it('denies a tool call outside the agent tier without ever pausing', async () => {
    const calls = []
    const journal = fakeJournal()
    const { deps, emitToolCall, respondedToolCalls } = fakeAcpDeps()
    // actorTiers below default so even 'write' tools are out of reach for the agent.
    const kit = createAcpAgentKit({
      catalog,
      journal,
      transport: fakeTransport(calls),
      actorTiers: { human: 2, agent: 0 },
      deps
    })
    deps.runAcpTurn = async () => {
      await emitToolCall({ requestId: 'mcp-1', tool: 'create', input: { name: 'x' } })
      return { content: '', trace: [], messages: [], stopped: undefined }
    }

    await kit.request({ intent: 'create x', agent: { agentKind: 'codex' } })

    expect(calls).toEqual([])
    expect(respondedToolCalls).toEqual([
      {
        requestId: 'mcp-1',
        envelope: { ok: false, error: { code: 'forbidden', message: 'Tool "create" is not allowed.' } }
      }
    ])
  })

  it('mirrors a native ACP permission request into the same pendingApproval shape and resolves the allow option', async () => {
    const journal = fakeJournal()
    const { deps, emitPermissionRequest, respondedPermissions } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport([]), deps })

    const permissionOptions = [
      { optionId: 'opt-allow', name: 'Allow', kind: 'allow_once' },
      { optionId: 'opt-reject', name: 'Reject', kind: 'reject_once' }
    ]
    let requestPromiseResolveGate
    deps.runAcpTurn = async () => {
      await emitPermissionRequest({
        requestId: 'perm-1',
        toolCall: { title: 'Edit file.txt' },
        options: permissionOptions
      })
      await new Promise(resolve => {
        requestPromiseResolveGate = resolve
      })
      return { content: 'Edited.', trace: [], messages: [], stopped: undefined }
    }

    const requestPromise = kit.request({ intent: 'edit file.txt', agent: { agentKind: 'claude' } })
    await flushMicrotasks()
    const [pendingId] = [...journal.store.keys()]
    expect(journal.store.get(pendingId).pendingApproval.kind).toBe('acp')

    const approveResult = await kit.approve({ requestId: pendingId, approve: true })
    expect(approveResult.status).toBe('running')
    expect(respondedPermissions).toEqual([{ requestId: 'perm-1', optionId: 'opt-allow' }])

    requestPromiseResolveGate()
    const finalResult = await requestPromise
    expect(finalResult.status).toBe('done')
  })

  it('resolves the reject option when a native ACP permission request is denied', async () => {
    const journal = fakeJournal()
    const { deps, emitPermissionRequest, respondedPermissions } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport([]), deps })

    let releaseTurn
    deps.runAcpTurn = async () => {
      await emitPermissionRequest({
        requestId: 'perm-1',
        toolCall: { title: 'Run rm -rf' },
        options: [
          { optionId: 'opt-allow', name: 'Allow', kind: 'allow_once' },
          { optionId: 'opt-reject', name: 'Reject', kind: 'reject_once' }
        ]
      })
      await new Promise(resolve => {
        releaseTurn = resolve
      })
      return { content: 'Skipped that.', trace: [], messages: [], stopped: undefined }
    }

    const requestPromise = kit.request({ intent: 'run rm -rf', agent: { agentKind: 'claude' } })
    await flushMicrotasks()
    const [pendingId] = [...journal.store.keys()]
    expect(journal.store.get(pendingId).status).toBe('needs_approval')

    const approveResult = await kit.approve({ requestId: pendingId, approve: false })

    expect(approveResult.status).toBe('running')
    expect(respondedPermissions).toEqual([{ requestId: 'perm-1', optionId: 'opt-reject' }])
    releaseTurn()
    await requestPromise
  })

  it('maps stopped reasons onto partial/needs_clarification status', async () => {
    const journal = fakeJournal()
    const { deps } = fakeAcpDeps()
    const kit = createAcpAgentKit({ catalog, journal, transport: fakeTransport([]), deps })

    deps.runAcpTurn = async () => ({ content: '', trace: [], messages: [], stopped: 'max_steps' })
    const maxSteps = await kit.request({ intent: 'a', agent: {} })
    expect(maxSteps.status).toBe('partial')

    deps.runAcpTurn = async () => ({ content: 'Which workspace?', trace: [], messages: [], stopped: undefined })
    const clarify = await kit.request({ intent: 'b', agent: {} })
    expect(clarify.status).toBe('needs_clarification')
    expect(clarify.question).toBe('Which workspace?')
  })
})
