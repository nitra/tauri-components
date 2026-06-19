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
 * Read a localStorage value, or null when localStorage is unavailable
 * (component tests without a DOM store, SSR).
 * @param {string} key storage key
 * @returns {string|null} stored value, or null
 */
function readStored(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  }
  catch {
    return null
  }
}

/**
 * Write a localStorage value; no-op when localStorage is unavailable.
 * @param {string} key storage key
 * @param {string} value value to store
 */
function writeStored(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value)
  }
  catch {
    // no localStorage (tests / SSR) — in-memory ref state is still updated
  }
}

/**
 * @param {{ storagePrefix?: string, defaultBaseUrl?: string, defaultModel?: string }} [options] config
 * @returns {{ baseUrl: import('vue').Ref<string>, model: import('vue').Ref<string>, apiKey: import('vue').Ref<string>, save: () => void, loadEnv: () => Promise<void> }} persisted omlx config, an env loader and a saver
 */
export function useOmlx({ storagePrefix = 'agent', defaultBaseUrl = DEFAULT_BASE_URL, defaultModel = '' } = {}) {
  const baseUrlKey = `${storagePrefix}:omlxBaseUrl`
  const modelKey = `${storagePrefix}:omlxModel`

  const baseUrl = ref(readStored(baseUrlKey) || defaultBaseUrl)
  const model = ref(readStored(modelKey) || defaultModel)
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
      env = await invoke('plugin:agent|omlx_config')
    }
    catch {
      return // not running under Tauri — keep localStorage / defaults
    }
    if (!env) return
    if (env.apiKey) apiKey.value = env.apiKey
    if (env.baseUrl && !readStored(baseUrlKey)) baseUrl.value = env.baseUrl
    if (env.model && !readStored(modelKey)) model.value = env.model
  }

  /**
   * Persist baseUrl/model to localStorage. The API key is intentionally NOT
   * persisted — it comes from the global OMLX_API_KEY env on each launch.
   */
  function save() {
    writeStored(baseUrlKey, baseUrl.value)
    writeStored(modelKey, model.value)
  }

  return { baseUrl, model, apiKey, save, loadEnv }
}
