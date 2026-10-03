// Перевірка оновлень із показом змін між поточною й новою версією.
// Як useUpdater() (перевірка через 3 с після старту й щогодини, у локальній збірці — вимкнено),
// але діалог показує секції CHANGELOG за всі версії з (поточна; нова] з changelog.json в artifact
// (його публікує scripts/publish-artifact.sh цього пакета). Потрібна tauri-команда `is_dev_build` — див. app-version.js.
import { getVersion } from '@tauri-apps/api/app'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { useQuasar } from 'quasar'
import { onMounted, onUnmounted } from 'vue'
import UpdateDialog from '../components/UpdateDialog.vue'
import { isDevBuild } from './app-version.js'
import { changesBetween } from '../app/changelog.js'

const FIRST_CHECK_DELAY_MS = 3000
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Зміни між поточною й новою версією з changelog.json; при будь-якій помилці — порожньо
 * (діалог оновлення все одно покажеться, лише без опису).
 * @param {typeof globalThis.fetch} fetchImpl - fetch
 * @param {string} changelogUrl - changelog.json останнього релізу
 * @param {string} current - поточна версія
 * @param {string} next - нова версія
 * @returns {Promise<import('../app/changelog.js').ChangelogEntry[]>} версії, новіші зверху
 */
export async function loadChanges(fetchImpl, changelogUrl, current, next) {
  try {
    const response = await fetchImpl(changelogUrl, { cache: 'no-store' })
    if (!response.ok) {
      return []
    }
    const { versions } = await response.json()
    return changesBetween(Array.isArray(versions) ? versions : [], current, next)
  } catch (error) {
    console.error('[updater] changelog failed:', error)
    return []
  }
}

/**
 * Підключає перевірку оновлень до компонента.
 * @param {{ changelogUrl: string }} options - changelogUrl: `<artifact>/latest/changelog.json` застосунку
 * @returns {void}
 */
export function useChangelogUpdater({ changelogUrl }) {
  const $q = useQuasar()
  let timer = null
  // Діалог відкритий або оновлення вже встановлено — не накладаємо фонові перевірки
  let busy = false

  /** Шукає нову версію й пропонує встановити її з описом змін. */
  async function checkForUpdates() {
    if (busy) {
      return
    }
    try {
      const update = await check()
      if (!update) {
        return
      }
      busy = true
      const current = await getVersion()
      const changes = await loadChanges(tauriFetch, changelogUrl, current, update.version)
      $q.dialog({ component: UpdateDialog, componentProps: { current, version: update.version, changes } })
        .onOk(() => installAndRelaunch(update))
        .onCancel(() => {
          busy = false
        })
    } catch (error) {
      console.error('[updater] check failed:', error)
    }
  }

  /**
   * Завантажує й встановлює оновлення з прогресом, потім пропонує перезапуск.
   * @param {import('@tauri-apps/plugin-updater').Update} update - знайдене оновлення
   */
  async function installAndRelaunch(update) {
    let downloaded = 0
    let total = 0
    const dismiss = $q.notify({ group: false, timeout: 0, spinner: true, message: 'Завантаження оновлення…' })
    try {
      await update.downloadAndInstall(event => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          if (total) {
            dismiss({ message: `Завантаження… ${Math.round((downloaded / total) * 100)}%` })
          }
        } else if (event.event === 'Finished') {
          dismiss()
        }
      })
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

  onMounted(async () => {
    // Локальна збірка з dev-змінами не оновлюється — це перезаписало б її релізною
    if (await isDevBuild()) {
      return
    }
    setTimeout(checkForUpdates, FIRST_CHECK_DELAY_MS)
    timer = setInterval(checkForUpdates, CHECK_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })
}
