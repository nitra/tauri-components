// Canonical `agents.<kind>` entries for useAcpAgent()/createAcpAgentKit()
// consumers — codex's MIN/AVG/MAX tiers follow this org's internal
// release-name scheme (gpt-5.6-luna/terra/sol), defined once here so
// consuming apps don't each redefine the same CODEX_CONFIG env per tier.
// Spawn command verified against the real published adapter package (the
// bare "codex-acp" name is not itself published) — see
// https://www.npmjs.com/package/@agentclientprotocol/codex-acp.

/**
 * @param {string} model codex model id (e.g. 'gpt-5.6-terra')
 * @returns {{CODEX_CONFIG: string}} env var merged into the codex-acp session config
 */
function codexModelEnv(model) {
  return { CODEX_CONFIG: JSON.stringify({ model }) }
}

export const CODEX_ACP_AGENT_PRESET = {
  command: 'npx',
  args: ['-y', '@agentclientprotocol/codex-acp'],
  tiers: {
    MIN: { label: 'GPT-5.6 Luna', env: codexModelEnv('gpt-5.6-luna') },
    AVG: { label: 'GPT-5.6 Terra', env: codexModelEnv('gpt-5.6-terra') },
    MAX: { label: 'GPT-5.6 Sol', env: codexModelEnv('gpt-5.6-sol') },
  },
}
