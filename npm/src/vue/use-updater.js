import { onMounted, onUnmounted } from 'vue'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { useQuasar } from 'quasar'

// Checks for an app update on mount and hourly thereafter, prompting via a
// Quasar dialog; after install, offers an immediate relaunch. Requires the
// host app's tauri.conf.json to configure plugins.updater (pubkey + endpoint)
// and capabilities/default.json to grant "updater:default" — without the
// capability, check() fails with a silent permission-denied that only surfaces
// via console.error (no dialog, no visible error).
//
// No-op in dev builds: tauri.conf.json's version is the CI-injected release
// version, not what's running locally, so the updater would always think dev
// code is stale.

const FIRST_CHECK_DELAY_MS = 3000
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * @returns {void}
 */
export function useUpdater() {
  if (import.meta.env.DEV) return

  const $q = useQuasar()
  let timer = null
  // A dialog is showing or an install already ran — don't stack background checks.
  let busy = false

  /**
   * Asks the configured update endpoint for a newer version and, if found,
   * walks the user through the install flow.
   * @returns {Promise<void>}
   */
  async function checkForUpdates() {
    if (busy) return
    try {
      const update = await check()
      if (!update) return

      busy = true
      $q.dialog({
        title: 'Доступне оновлення',
        message: `Версія ${update.version} готова. Встановити зараз?`,
        cancel: { label: 'Пізніше', flat: true },
        ok: { label: 'Встановити', color: 'primary' },
        persistent: true
      })
        .onOk(() => installAndRelaunch(update))
        .onCancel(() => {
          busy = false
        })
    } catch (error) {
      // No network, or the updater isn't configured/permitted — don't bother
      // the user, but leave a trace for diagnosis.
      console.error('[updater] check failed:', error)
    }
  }

  /**
   * Downloads and installs the update with progress, then offers a relaunch.
   * @param {import('@tauri-apps/plugin-updater').Update} update the update found by check()
   * @returns {Promise<void>}
   */
  async function installAndRelaunch(update) {
    let downloaded = 0
    let total = 0
    const dismiss = $q.notify({ group: false, timeout: 0, spinner: true, message: 'Завантаження оновлення…' })
    try {
      await update.downloadAndInstall(event => {
        switch (event.event) {
          case 'Started': {
            total = event.data.contentLength ?? 0
            break
          }
          case 'Progress': {
            downloaded += event.data.chunkLength
            if (total) dismiss({ message: `Завантаження… ${Math.round((downloaded / total) * 100)}%` })
            break
          }
          case 'Finished': {
            dismiss()
            break
          }
          // No default
        }
      })
      // busy stays true: the update is already on disk, a repeat check would
      // only offer to install the same thing again.
      $q.dialog({
        title: 'Оновлення встановлено',
        message: `Перезапустити зараз, щоб перейти на версію ${update.version}?`,
        cancel: { label: 'Пізніше', flat: true },
        ok: { label: 'Перезапустити', color: 'primary' },
        persistent: true
      }).onOk(() => relaunch())
    } catch (error) {
      dismiss()
      busy = false
      console.error('[updater] install failed:', error)
      $q.notify({ message: `Помилка оновлення: ${error}`, color: 'negative', timeout: 5000 })
    }
  }

  onMounted(() => {
    setTimeout(checkForUpdates, FIRST_CHECK_DELAY_MS)
    timer = setInterval(checkForUpdates, CHECK_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
}
