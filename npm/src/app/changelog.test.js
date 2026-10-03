import { describe, expect, it } from 'vitest'

import { changesBetween, compareVersions, entryToMarkdown, parseChangelog } from './changelog.js'

const MARKDOWN = `# Changelog

Вступ.

## [0.3.0] - 2026-10-02

### Added

- Нова фіча
  з продовженням.

### Fixed

- Виправлення.

## [0.2.5] - 2026-09-30

### Fixed

- Шапка у світлій темі.

## [0.2.4] - 2026-09-30

### Changed

- Щось змінено.
`

describe('changelog', () => {
  const entries = parseChangelog(MARKDOWN)

  it('розбирає версії, дати, секції та багаторядкові пункти', () => {
    expect(entries.map(e => e.version)).toEqual(['0.3.0', '0.2.5', '0.2.4'])
    expect(entries[0]).toEqual({
      version: '0.3.0',
      date: '2026-10-02',
      sections: [
        { title: 'Added', items: ['Нова фіча з продовженням.'] },
        { title: 'Fixed', items: ['Виправлення.'] }
      ]
    })
  })

  it('порівнює версії числово', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('0.2.5', '0.2.5')).toBe(0)
    expect(compareVersions('0.2.4', '0.2.5')).toBeLessThan(0)
  })

  it('віддає зміни з (поточна; нова], новіші зверху', () => {
    expect(changesBetween(entries, '0.2.4', '0.3.0').map(e => e.version)).toEqual(['0.3.0', '0.2.5'])
    expect(changesBetween(entries, '0.2.5', '0.2.5')).toEqual([])
  })

  it('формує markdown версії для опису релізу', () => {
    expect(entryToMarkdown(entries[1])).toBe('### Fixed\n\n- Шапка у світлій темі.')
    expect(entryToMarkdown(undefined)).toBe('')
  })
})
