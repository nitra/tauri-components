import { describe, expect, it } from 'vitest'
import { createAgentKit } from './agent-kit.js'

// A catalog mirroring the task surface shape: read / write / destructive tiers.
const catalog = [
  { tier: 'read', name: 'workspaces', summary: 'list workspaces', input: {}, tauri: 'find_ws' },
  { tier: 'read', name: 'scan', summary: 'scan a dir', input: { dir: { type: 'string', required: true } }, tauri: 'scan_cmd' },
  { tier: 'write', name: 'create', summary: 'create a node', input: { name: { type: 'string', required: true } }, tauri: 'create_cmd' },
  { tier: 'destructive', name: 'remove', summary: 'remove a node', input: { name: { type: 'string', required: true } }, tauri: 'remove_cmd' },
]

/** In-memory journal store matching the injected contract. */
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
    list: () => Promise.resolve([...store.values()]),
  }
}

/**
 * Transport that echoes which tool ran (records calls for assertions).
 * @param calls
 */
function fakeTransport(calls) {
  return (tool, input) => {
    calls.push({ name: tool.name, input })
    if (tool.name === 'workspaces') return [{ label: 'abie', path: '/p/abie' }]
    return `${tool.name}:done`
  }
}

/**
 * A chat fn that replays a scripted queue of assistant messages and records prompts.
 * @param queue
 * @param seenSystems
 */
function scriptedChat(queue, seenSystems = []) {
  let i = 0
  return ({ messages }) => {
    const system = messages.find(m => m.role === 'system')
    if (system) seenSystems.push(system.content)
    return Promise.resolve(queue[i++])
  }
}

const toolCall = (id, name, args) => ({ role: 'assistant', content: '', tool_calls: [{ id, function: { name, arguments: JSON.stringify(args) } }] })

describe('createAgentKit', () => {
  it('throws without a catalog', () => {
    expect(() => createAgentKit({})).toThrow(/catalog/)
  })

  it('runs a human request through dispatch and journals a done result', async () => {
    const calls = []
    const journal = fakeJournal()
    const kit = createAgentKit({ catalog, systemPrompt: 'sys', transport: fakeTransport(calls), journal })
    const chat = scriptedChat([
      toolCall('c1', 'scan', { dir: '/x' }),
      { role: 'assistant', content: 'Scanned /x.' },
    ])

    const res = await kit.request({ intent: 'scan /x', actor: { kind: 'human' }, chat })

    expect(res.status).toBe('done')
    expect(res.summary).toBe('Scanned /x.')
    expect(calls).toEqual([{ name: 'scan', input: { dir: '/x' } }])
    expect(res.actions[0].envelope).toEqual({ ok: true, output: 'scan:done' })
    expect(journal.store.get(res.requestId).status).toBe('done')
  })

  it('pauses an agent destructive call as needs_approval without executing it', async () => {
    const calls = []
    const journal = fakeJournal()
    const kit = createAgentKit({ catalog, systemPrompt: 'sys', transport: fakeTransport(calls), journal })
    const chat = scriptedChat([toolCall('c1', 'remove', { name: 'old' })])

    const res = await kit.request({ intent: 'remove old', actor: { kind: 'agent' }, chat })

    expect(res.status).toBe('needs_approval')
    expect(res.pendingApproval).toEqual({ tool: 'remove', input: { name: 'old' } })
    expect(calls).toEqual([]) // never dispatched
  })

  it('executes the pending action on human approval', async () => {
    const calls = []
    const journal = fakeJournal()
    const kit = createAgentKit({ catalog, systemPrompt: 'sys', transport: fakeTransport(calls), journal })
    const chat = scriptedChat([toolCall('c1', 'remove', { name: 'old' })])
    const { requestId } = await kit.request({ intent: 'remove old', actor: { kind: 'agent' }, chat })

    const res = await kit.approve({ requestId, approve: true })

    expect(res.status).toBe('done')
    expect(calls).toEqual([{ name: 'remove', input: { name: 'old' } }])
  })

  it('rejects a pending action without executing it', async () => {
    const calls = []
    const journal = fakeJournal()
    const kit = createAgentKit({ catalog, systemPrompt: 'sys', transport: fakeTransport(calls), journal })
    const chat = scriptedChat([toolCall('c1', 'remove', { name: 'old' })])
    const { requestId } = await kit.request({ intent: 'remove old', actor: { kind: 'agent' }, chat })

    const res = await kit.approve({ requestId, approve: false })

    expect(res.status).toBe('rejected')
    expect(calls).toEqual([])
  })

  it('reports schema validation failures as a tool envelope error', async () => {
    const journal = fakeJournal()
    const kit = createAgentKit({ catalog, systemPrompt: 'sys', transport: fakeTransport([]), journal })
    const chat = scriptedChat([
      toolCall('c1', 'create', {}), // missing required name
      { role: 'assistant', content: 'Could not create.' },
    ])

    const res = await kit.request({ intent: 'create', actor: { kind: 'human' }, chat })

    expect(res.actions[0].envelope.ok).toBe(false)
    expect(res.actions[0].envelope.error.code).toBe('validation')
  })

  it('injects grounding output into the system prompt builder', async () => {
    const seenSystems = []
    const journal = fakeJournal()
    const kit = createAgentKit({
      catalog,
      transport: fakeTransport([]),
      journal,
      grounding: { tool: 'workspaces', key: 'workspaces' },
      systemPrompt: ctx => `WS=${JSON.stringify(ctx.workspaces)}`,
    })
    const chat = scriptedChat([{ role: 'assistant', content: 'hi' }], seenSystems)

    await kit.request({ intent: 'hello', actor: { kind: 'human' }, chat })

    expect(seenSystems[0]).toBe('WS=[{"label":"abie","path":"/p/abie"}]')
  })
})
