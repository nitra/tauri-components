import { describe, expect, it } from 'vitest'
import { classify, scopedManifest, scopedToolNames } from './scope.js'

const catalog = [
  { tier: 'read', name: 'scan', summary: 'scan', input: {} },
  { tier: 'write', name: 'create', summary: 'create', input: {} },
  { tier: 'destructive', name: 'remove', summary: 'remove', input: {} },
]

const human = { kind: 'human' }
const agent = { kind: 'agent' }
const guest = { kind: 'guest' }

describe('classify (default tiers human:2 agent:1)', () => {
  it('lets a human run every tier directly', () => {
    expect(classify(catalog, undefined, human, 'scan')).toBe('allow')
    expect(classify(catalog, undefined, human, 'create')).toBe('allow')
    expect(classify(catalog, undefined, human, 'remove')).toBe('allow')
  })

  it('lets an agent run read+write but pauses destructive for approval', () => {
    expect(classify(catalog, undefined, agent, 'scan')).toBe('allow')
    expect(classify(catalog, undefined, agent, 'create')).toBe('allow')
    expect(classify(catalog, undefined, agent, 'remove')).toBe('approval')
  })

  it('denies an unknown actor everything above read', () => {
    expect(classify(catalog, undefined, guest, 'scan')).toBe('allow')
    expect(classify(catalog, undefined, guest, 'create')).toBe('deny')
    expect(classify(catalog, undefined, guest, 'remove')).toBe('deny')
  })

  it('denies unknown tools', () => {
    expect(classify(catalog, undefined, human, 'nope')).toBe('deny')
  })

  it('honors custom actorTiers overrides', () => {
    // bot may execute destructive directly
    expect(classify(catalog, { bot: 2 }, { kind: 'bot' }, 'remove')).toBe('allow')
  })
})

describe('scoped views', () => {
  it('scopedManifest keeps approval-eligible tools visible to an agent', () => {
    const names = scopedManifest(catalog, undefined, agent).map(t => t.function.name)
    expect(names).toEqual(['scan', 'create', 'remove'])
  })

  it('scopedToolNames hides denied tools from a guest', () => {
    expect(scopedToolNames(catalog, undefined, guest)).toEqual(['scan'])
  })
})
