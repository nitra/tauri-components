// Версія застосунку для показу і чи можна його оновлювати: локальна (debug) збірка — це dev-зміни,
// тому вона показує 0.0.0 і не оновлюється сама. Потрібна tauri-команда `is_dev_build` у застосунку
// (`cfg!(debug_assertions)`); без неї (vite dev у браузері) — `import.meta.env.DEV`.
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'

/** @type {string} версія, яку показує локальна збірка */
export const DEV_VERSION = '0.0.0'

/**
 * Чи це локальна збірка (tauri dev / tauri build --debug).
 * @returns {Promise<boolean>} true — не реліз
 */
export async function isDevBuild() {
  try {
    return await invoke('is_dev_build')
  } catch {
    return import.meta.env.DEV
  }
}

/**
 * Версія для заголовка вікна: у локальній збірці 0.0.0, інакше з tauri.conf.json.
 * @returns {Promise<string>} версія
 */
export async function displayVersion() {
  return (await isDevBuild()) ? DEV_VERSION : getVersion()
}
