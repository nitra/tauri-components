import { computed, ref, watch } from 'vue'
import { acpConfig, startAcpMcpBridge } from '../core/acp-agent.js'
import { createAcpAgentKit } from '../core/acp-kit.js'
import { createTauriJournalStore } from './journal-store-tauri.js'
import { tauriTransport } from './transports.js'

// In-app ACP agent gateway — the sole agent composable (the earlier
// omlx/runAgent-based `useAgent()` has been removed; see CHANGELOG). Binds an
// app's catalog to createAcpAgentKit and resolves two independent defaults per
// SPEC/plan:
//
// - which AGENT (codex/claude/cursor/pi) — per-machine, from `ACP_DEFAULT_AGENT`
//   (via `acp_config()`), since different developers have different CLIs
//   installed; the human can still override `agentKind.value` in the UI.
// - which MODEL — the app-owned MIN/AVG/MAX abstraction: each entry in
//   `agents[kind].tiers` is a concrete preset (e.g. `codex.tiers.MAX` = the
//   "ChatGPT 5.6 Sol" args/env). A caller can request a tier per call
//   (`request(intent, { modelTier: 'MAX' })`); otherwise `defaultTier` applies.
//
// The domain MCP bridge is started once (`loadEnv()`) and its URL is reused
// for every spawned session.

const DEFAULT_TIER = 'AVG'

/**
 * @param {object} config gateway config
 * @param {object[]} config.catalog app tool catalog (required — passed to the domain MCP bridge)
 * @param {Record<string, {command: string, args?: string[], env?: Record<string,string>, tiers: Record<string, {label: string, args?: string[], env?: Record<string,string>}>}>} config.agents per-agent-kind spawn presets, keyed by 'codex'|'claude'|'cursor'|'pi'
 * @param {string} [config.defaultTier] fallback modelTier when a request doesn't specify one (default 'AVG')
 * @param {string} config.cwd session working directory (absolute path)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {(tool: object, input: object) => unknown} [config.transport] tool transport (default Tauri invoke)
 * @returns {object} in-app ACP agent gateway
 */
export function useAcpAgent({
  catalog,
  agents = {},
  defaultTier = DEFAULT_TIER,
  cwd,
  actorTiers,
  transport = tauriTransport
} = {}) {
  const defaultAgentKind = ref(null)
  const agentKind = ref(null)
  const modelTier = ref(defaultTier)
  const mcpBridgeUrl = ref(null)
  const journal = createTauriJournalStore()
  const kit = createAcpAgentKit({ catalog, journal, transport, actorTiers })

  // Tiers are per-agent presets (see `agents[kind].tiers` above) — a tier id
  // picked for the PREVIOUS agent (e.g. cursor's "AVG" = Grok 4.5) doesn't
  // necessarily exist for the newly selected one (pi has no tiers at all), so
  // switching agentKind must re-resolve modelTier instead of leaving it
  // pointing at a tier the UI can no longer show a matching label for.
  watch(agentKind, kind => {
    const tiers = agents[kind]?.tiers ?? {}
    modelTier.value = defaultTier in tiers ? defaultTier : (Object.keys(tiers)[0] ?? '')
  })

  /**
   * Read the per-machine default agent (`ACP_DEFAULT_AGENT`) and start the
   * domain MCP bridge. Call once before the first `request()` — mirrors
   * `useOmlx().loadEnv()`. No-op-safe outside Tauri (tests / web): falls back
   * to the first configured agent and leaves the MCP bridge unset.
   * @returns {Promise<void>} resolves once defaults are resolved
   */
  async function loadEnv() {
    const configuredKinds = Object.keys(agents)
    try {
      const cfg = await acpConfig()
      defaultAgentKind.value =
        cfg.defaultAgentKind && agents[cfg.defaultAgentKind] ? cfg.defaultAgentKind : (configuredKinds[0] ?? null)
    } catch {
      defaultAgentKind.value = configuredKinds[0] ?? null
    }
    if (!agentKind.value) agentKind.value = defaultAgentKind.value

    if (catalog?.length) {
      try {
        mcpBridgeUrl.value = await startAcpMcpBridge(catalog)
      } catch {
        mcpBridgeUrl.value = null
      }
    }
  }

  /**
   * Build `createAcpSession` args for the currently selected agent + tier.
   * @returns {object} spawn args
   */
  function resolveSpawnArgs() {
    const preset = agents[agentKind.value]
    if (!preset) throw new Error(`useAcpAgent: no preset configured for agent "${agentKind.value}"`)
    const tier = preset.tiers?.[modelTier.value]
    return {
      agentKind: agentKind.value,
      command: preset.command,
      args: [...(preset.args ?? []), ...(tier?.args ?? [])],
      env: { ...preset.env, ...tier?.env },
      cwd,
      mcpBridgeUrl: mcpBridgeUrl.value ?? undefined
    }
  }

  return {
    agentKind,
    modelTier,
    defaultAgentKind,
    availableAgentKinds: computed(() => Object.keys(agents)),
    availableTiers: computed(() =>
      Object.entries(agents[agentKind.value]?.tiers ?? {}).map(([id, t]) => ({ id, label: t.label ?? id }))
    ),
    loadEnv,
    journal,
    /**
     * @param {string} intent user prompt
     * @param {{modelTier?: string}} [opts] per-call overrides
     * @returns {Promise<object>} structured result envelope
     */
    request: (intent, opts = {}) => {
      if (opts.modelTier) modelTier.value = opts.modelTier
      return kit.request({ intent, agent: resolveSpawnArgs() })
    },
    respond: (requestId, message) => kit.respond({ requestId, message }),
    approve: (requestId, approve) => kit.approve({ requestId, approve })
  }
}
