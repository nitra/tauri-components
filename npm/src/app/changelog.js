// Розбір app/CHANGELOG.md (Keep a Changelog) у структуру для changelog.json та вибір змін між версіями.
// Використовується і застосунком (діалог оновлення), і CI (app/scripts/changelog.mjs) — тому без залежностей.

/**
 * @typedef {{ title: string, items: string[] }} ChangelogSection секція версії (Added, Changed, Fixed, Removed)
 * @typedef {{ version: string, date: string | null, sections: ChangelogSection[] }} ChangelogEntry версія
 */

const VERSION_HEADING = /^## \[(\d+\.\d+\.\d+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/
const SECTION_HEADING = /^### (.+?)\s*$/
const ITEM = /^[-*] (.+)$/

/**
 * Розбирає CHANGELOG.md у список версій (у порядку файлу — новіші зверху).
 * Багаторядкові пункти (продовження з відступом) склеюються в один рядок.
 * @param {string} markdown - вміст CHANGELOG.md
 * @returns {ChangelogEntry[]} версії з секціями
 */
export function parseChangelog(markdown) {
  /** @type {ChangelogEntry[]} */
  const entries = []
  /** @type {ChangelogEntry | null} */
  let entry = null
  /** @type {ChangelogSection | null} */
  let section = null

  for (const line of markdown.split(/\r?\n/)) {
    const version = VERSION_HEADING.exec(line)
    if (version) {
      entry = { version: version[1], date: version[2] ?? null, sections: [] }
      entries.push(entry)
      section = null
      continue
    }
    if (!entry) {
      continue
    }
    const heading = SECTION_HEADING.exec(line)
    if (heading) {
      section = { title: heading[1], items: [] }
      entry.sections.push(section)
      continue
    }
    if (!section) {
      continue
    }
    const item = ITEM.exec(line)
    if (item) {
      section.items.push(item[1].trim())
    } else if (/^\s+\S/.test(line) && section.items.length > 0) {
      section.items[section.items.length - 1] += ` ${line.trim()}`
    }
  }

  return entries.map(e => ({ ...e, sections: e.sections.filter(s => s.items.length > 0) }))
}

/**
 * Порівнює версії X.Y.Z.
 * @param {string} a - версія
 * @param {string} b - версія
 * @returns {number} <0 якщо a<b, 0 якщо рівні, >0 якщо a>b
 */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

/**
 * Зміни, які отримає користувач при оновленні: версії з (from; to], новіші зверху.
 * @param {ChangelogEntry[]} entries - версії з changelog.json
 * @param {string} from - поточна версія застосунку (не включно)
 * @param {string} to - нова версія (включно)
 * @returns {ChangelogEntry[]} версії між поточною й новою
 */
export function changesBetween(entries, from, to) {
  return entries
    .filter(e => compareVersions(e.version, from) > 0 && compareVersions(e.version, to) <= 0)
    .toSorted((a, b) => compareVersions(b.version, a.version))
}

/**
 * Markdown однієї версії без заголовка версії — для опису Forgejo-релізу й notes у latest.json.
 * @param {ChangelogEntry | undefined} entry - версія
 * @returns {string} секції з пунктами або порожній рядок
 */
export function entryToMarkdown(entry) {
  if (!entry) {
    return ''
  }
  return entry.sections.map(s => `### ${s.title}\n\n${s.items.map(i => `- ${i}`).join('\n')}`).join('\n\n')
}
