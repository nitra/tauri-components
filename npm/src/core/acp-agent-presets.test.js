import { describe, expect, it } from 'vitest'
import { CODEX_ACP_AGENT_PRESET } from './acp-agent-presets.js'

describe('CODEX_ACP_AGENT_PRESET', () => {
  it('spawns the real published codex-acp adapter, not the bare unpublished name', () => {
    expect(CODEX_ACP_AGENT_PRESET.command).toBe('npx')
    expect(CODEX_ACP_AGENT_PRESET.args).toEqual(['-y', '@agentclientprotocol/codex-acp'])
  })

  it('defines MIN/AVG/MAX with the org codex model release names', () => {
    const models = Object.fromEntries(
      Object.entries(CODEX_ACP_AGENT_PRESET.tiers).map(([tier, preset]) => [
        tier,
        JSON.parse(preset.env.CODEX_CONFIG).model
      ])
    )
    expect(models).toEqual({
      MIN: 'gpt-5.6-luna',
      AVG: 'gpt-5.6-terra',
      MAX: 'gpt-5.6-sol'
    })
  })

  it('every tier has a human-readable label', () => {
    for (const preset of Object.values(CODEX_ACP_AGENT_PRESET.tiers)) {
      expect(typeof preset.label).toBe('string')
      expect(preset.label.length).toBeGreaterThan(0)
    }
  })
})
