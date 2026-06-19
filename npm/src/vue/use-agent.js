import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { createAgentKit } from '../core/agent-kit.js'
import { createOpenAiChat } from '../core/llm.js'
import { createTauriJournalStore } from './journal-store-tauri.js'
import { tauriTransport } from './transports.js'
import { useOmlx } from './use-omlx.js'

// In-app agent gateway: binds an app's catalog/prompt to the webview transports —
// omlx via tauri-http, tools via Tauri invoke, journal via the tauri-plugin-agent
// commands. Returns a flat surface the dialogs consume: request(intent),
// respond(id, msg), approve(id, ok) plus the omlx config refs and the journal.
//
// Apps pass their catalog + systemPrompt (+ optional grounding/omlx defaults);
// everything Tauri-specific is wired here so feature dialogs stay domain-free.

const DEFAULT_ACTOR = { kind: 'human', id: 'local' }

/**
 * @param {object} config gateway config
 * @param {object[]} config.catalog app tool catalog (required)
 * @param {string|((ctx: object) => string)} [config.systemPrompt] domain prompt or builder
 * @param {{ tool: string, key?: string, fallback?: unknown }} [config.grounding] optional prompt grounding
 * @param {Record<string, number>} [config.actorTiers] tier overrides
 * @param {{ kind: string, id: string }} [config.actor] caller identity (default human:local)
 * @param {{ storagePrefix?: string, defaultBaseUrl?: string, defaultModel?: string }} [config.omlx] omlx config options
 * @param {(tool: object, input: object) => unknown} [config.transport] tool transport (default Tauri invoke); override to route some tools elsewhere (e.g. JS/OPFS-backed handlers)
 * @returns {object} in-app agent gateway
 */
export function useAgent({ catalog, systemPrompt, grounding, actorTiers, actor = DEFAULT_ACTOR, omlx, transport = tauriTransport } = {}) {
  const { baseUrl, model, apiKey, save, loadEnv } = useOmlx(omlx)
  const journal = createTauriJournalStore()
  const kit = createAgentKit({ catalog, systemPrompt, transport, journal, actorTiers, grounding })

  /**
   * Build an omlx chat fn from the current config (tauri-http transport).
   * @returns {(req: object) => Promise<object>} chat function
   */
  function chat() {
    return createOpenAiChat({
      baseUrl: baseUrl.value,
      model: model.value,
      apiKey: apiKey.value || undefined,
      fetchFn: tauriFetch,
    })
  }

  return {
    baseUrl,
    model,
    apiKey,
    saveOmlx: save,
    loadOmlxEnv: loadEnv,
    journal,
    request: intent => kit.request({ intent, actor, chat: chat() }),
    respond: (requestId, message) => kit.respond({ requestId, message, actor, chat: chat() }),
    approve: (requestId, approve) => kit.approve({ requestId, approve }),
  }
}
