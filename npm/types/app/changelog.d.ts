/**
 * Розбирає CHANGELOG.md у список версій (у порядку файлу — новіші зверху).
 * Багаторядкові пункти (продовження з відступом) склеюються в один рядок.
 * @param {string} markdown - вміст CHANGELOG.md
 * @returns {ChangelogEntry[]} версії з секціями
 */
export function parseChangelog(markdown: string): ChangelogEntry[];
/**
 * Порівнює версії X.Y.Z.
 * @param {string} a - версія
 * @param {string} b - версія
 * @returns {number} <0 якщо a<b, 0 якщо рівні, >0 якщо a>b
 */
export function compareVersions(a: string, b: string): number;
/**
 * Зміни, які отримає користувач при оновленні: версії з (from; to], новіші зверху.
 * @param {ChangelogEntry[]} entries - версії з changelog.json
 * @param {string} from - поточна версія застосунку (не включно)
 * @param {string} to - нова версія (включно)
 * @returns {ChangelogEntry[]} версії між поточною й новою
 */
export function changesBetween(entries: ChangelogEntry[], from: string, to: string): ChangelogEntry[];
/**
 * Markdown однієї версії без заголовка версії — для опису Forgejo-релізу й notes у latest.json.
 * @param {ChangelogEntry | undefined} entry - версія
 * @returns {string} секції з пунктами або порожній рядок
 */
export function entryToMarkdown(entry: ChangelogEntry | undefined): string;
/**
 * секція версії (Added, Changed, Fixed, Removed)
 */
export type ChangelogSection = {
    title: string;
    items: string[];
};
/**
 * версія
 */
export type ChangelogEntry = {
    version: string;
    date: string | null;
    sections: ChangelogSection[];
};
