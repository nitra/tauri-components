import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn() }))
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))
vi.mock('quasar', () => ({ useQuasar: vi.fn() }))
vi.mock('../components/UpdateDialog.vue', () => ({ default: {} }))

const { loadChanges } = await import('./use-changelog-updater.js')

const VERSIONS = [
  { version: '0.3.0', date: '2026-10-02', sections: [{ title: 'Added', items: ['a'] }] },
  { version: '0.2.5', date: '2026-09-30', sections: [{ title: 'Fixed', items: ['b'] }] },
  { version: '0.2.4', date: '2026-09-30', sections: [{ title: 'Fixed', items: ['c'] }] }
]

const CHANGELOG_URL = 'https://example.test/latest/changelog.json'

describe('loadChanges', () => {
  it('бере changelog.json з artifact і віддає версії з (поточна; нова]', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ versions: VERSIONS }) }))

    const changes = await loadChanges(fetchImpl, CHANGELOG_URL, '0.2.4', '0.3.0')

    expect(fetchImpl).toHaveBeenCalledWith(CHANGELOG_URL, { cache: 'no-store' })
    expect(changes.map(c => c.version)).toEqual(['0.3.0', '0.2.5'])
  })

  it('при помилці мережі чи HTTP повертає порожній список', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await loadChanges(async () => ({ ok: false }), CHANGELOG_URL, '0.2.4', '0.3.0')).toEqual([])
    expect(
      await loadChanges(
        async () => {
          throw new Error('offline')
        },
        CHANGELOG_URL,
        '0.2.4',
        '0.3.0'
      )
    ).toEqual([])
  })
})
