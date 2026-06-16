import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

// Persisted config for the local omlx server (OpenAI-compatible MLX) that drives
// the in-app agent. The API key / base URL come from Rust (omlx_config), which
// reads them from ~/.omlx/settings.json — the same file the omlx server uses, so
// the config is portable between machines without env/launchd setup. baseUrl is
// edited in the dialog and cached in localStorage; omlx_config is the default
// when localStorage is empty. Priority for base: localStorage > omlx_config >
// hardcoded default. The key always comes from omlx_config.
//
// storagePrefix namespaces the localStorage keys per app (so `task` and `mlmail`
// keep independent base/model). defaults seed first launch.

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/v1'

/**
 * @param {{ storagePrefix?: string, defaultBaseUrl?: string, defaultModel?: string }} [options] config
 * @returns {{ baseUrl: import('vue').Ref<string>, model: import('vue').Ref<string>, apiKey: import('vue').Ref<string>, save: () => void, loadEnv: () => Promise<void> }} persisted omlx config, an env loader and a saver
 */
export function useOmlx({ storagePrefix = 'agent', defaultBaseUrl = DEFAULT_BASE_URL, defaultModel = '' } = {}) {
  const baseUrlKey = `${storagePrefix}:omlxBaseUrl`
  const modelKey = `${storagePrefix}:omlxModel`

  const baseUrl = ref(localStorage.getItem(baseUrlKey) || defaultBaseUrl)
  const model = ref(localStorage.getItem(modelKey) || defaultModel)
  // Filled from the global env in loadEnv(); never persisted to localStorage.
  const apiKey = ref('')

  /**
   * Pull OMLX_* from the user's global env (via Rust) and apply them: the API
   * key is taken verbatim; baseUrl/model only fill in when localStorage is empty,
   * so a value set in the dialog still wins. No-op outside Tauri (tests / web).
   * @returns {Promise<void>}
   */
  async function loadEnv() {
    let env
    try {
      env = await invoke('omlx_config')
    }
    catch {
      return // not running under Tauri — keep localStorage / defaults
    }
    if (!env) return
    if (env.apiKey) apiKey.value = env.apiKey
    if (env.baseUrl && !localStorage.getItem(baseUrlKey)) baseUrl.value = env.baseUrl
    if (env.model && !localStorage.getItem(modelKey)) model.value = env.model
  }

  /**
   * Persist baseUrl/model to localStorage. The API key is intentionally NOT
   * persisted — it comes from the global OMLX_API_KEY env on each launch.
   */
  function save() {
    localStorage.setItem(baseUrlKey, baseUrl.value)
    localStorage.setItem(modelKey, model.value)
  }

  return { baseUrl, model, apiKey, save, loadEnv }
}
