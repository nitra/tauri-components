import { computed, ref, watch } from 'vue'
import { acpConfig, listAcpTiers, startAcpMcpBridge } from '../core/acp-agent.js'
import { createAcpAgentKit } from '../core/acp-kit.js'
import { createTauriJournalStore } from './journal-store-tauri.js'
import { tauriTransport } from './transports.js'

// In-app ACP agent gateway — the sole agent composable. Binds an app's
// catalog to createAcpAgentKit and resolves two independent defaults:
//
// - which AGENT (cursor/codex/pi) — per-machine, from `ACP_DEFAULT_AGENT`
//   (via `acp_config()`), since different developers have different CLIs
//   installed; the human can still override `agentKind.value` in the UI.
// - which MODEL — the min/avg/max tier abstraction. Both the kind list and
//   each kind's tiers (ids + UI labels) come from the backend
//   (`acp_list_tiers`, i.e. the Rust presets in `llm-lib`) — this package
//   carries zero model knowledge and just renders what the backend returns.
//   A caller can request a tier per call (`request(intent, { modelTier:
//   'max' })`); otherwise `defaultTier` applies.
//
// The domain MCP bridge is started once (`loadEnv()`) and its URL is reused
// for every spawned session.

const DEFAULT_TIER = 'avg'

/**
 * @param {object} config gateway config
 * @param {object[]} config.catalog app tool catalog (required — passed to the domain MCP bridge)
 * @param {string} [config.defaultTier] fallback modelTier when a request doesn't specify one (default 'avg')
 * @param {string} config.cwd session working directory (absolute path)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {(tool: object, input: object) => unknown} [config.transport] tool transport (default Tauri invoke)
 * @returns {object} in-app ACP agent gateway
 */
export function useAcpAgent({ catalog, defaultTier = DEFAULT_TIER, cwd, actorTiers, transport = tauriTransport } = {}) {
  const presets = ref({})
  const defaultAgentKind = ref(null)
  const agentKind = ref(null)
  const modelTier = ref(defaultTier)
  const mcpBridgeUrl = ref(null)
  const journal = createTauriJournalStore()
  const kit = createAcpAgentKit({ catalog, journal, transport, actorTiers })

  // A tier id picked for the PREVIOUS agent doesn't necessarily exist for the
  // newly selected one, so switching agentKind must re-resolve modelTier
  // instead of leaving it pointing at a tier the UI can no longer show a
  // matching label for.
  watch(agentKind, kind => {
    const tiers = presets.value[kind]?.tiers ?? {}
    modelTier.value = defaultTier in tiers ? defaultTier : (Object.keys(tiers)[0] ?? '')
  })

  /**
   * Fetch the agent/tier presets from the backend (`acp_list_tiers`), read
   * the per-machine default agent (`ACP_DEFAULT_AGENT`), and start the domain
   * MCP bridge. Call once before the first `request()`. No-op-safe outside
   * Tauri (tests / web): presets stay empty and the MCP bridge unset.
   * @returns {Promise<void>} resolves once defaults are resolved
   */
  async function loadEnv() {
    try {
      presets.value = (await listAcpTiers()) ?? {}
    } catch {
      presets.value = {}
    }
    const kinds = Object.keys(presets.value)
    try {
      const cfg = await acpConfig()
      defaultAgentKind.value =
        cfg.defaultAgentKind && presets.value[cfg.defaultAgentKind] ? cfg.defaultAgentKind : (kinds[0] ?? null)
    } catch {
      defaultAgentKind.value = kinds[0] ?? null
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
   * Build `createAcpSession` args for the currently selected agent + tier —
   * just names; the backend resolves them against the Rust presets.
   * @returns {object} spawn args
   */
  function resolveSpawnArgs() {
    if (!presets.value[agentKind.value]) {
      throw new Error(`useAcpAgent: no backend preset for agent "${agentKind.value}"`)
    }
    return {
      agentKind: agentKind.value,
      tier: modelTier.value || undefined,
      cwd,
      mcpBridgeUrl: mcpBridgeUrl.value ?? undefined
    }
  }

  return {
    agentKind,
    modelTier,
    defaultAgentKind,
    availableAgentKinds: computed(() => Object.keys(presets.value)),
    availableTiers: computed(() =>
      Object.entries(presets.value[agentKind.value]?.tiers ?? {}).map(([id, t]) => ({ id, label: t.label ?? id }))
    ),
    loadEnv,
    journal,
    /**
     * @param {string} intent user prompt
     * @param {{modelTier?: string, onChunk?: (snapshot: {text: string, actions: object[]}) => void}} [opts] per-call overrides; `onChunk` streams live text/tool-calls as the turn runs
     * @returns {Promise<object>} structured result envelope
     */
    request: (intent, opts = {}) => {
      if (opts.modelTier) modelTier.value = opts.modelTier
      return kit.request({ intent, agent: resolveSpawnArgs(), onChunk: opts.onChunk })
    },
    /**
     * @param {string} requestId journal record id from a prior request()/respond()
     * @param {string} message follow-up user message
     * @param {{onChunk?: (snapshot: {text: string, actions: object[]}) => void}} [opts] `onChunk` streams live text/tool-calls as the turn runs
     * @returns {Promise<object>} updated result envelope
     */
    respond: (requestId, message, opts = {}) => kit.respond({ requestId, message, onChunk: opts.onChunk }),
    approve: (requestId, approve) => kit.approve({ requestId, approve })
  }
}
