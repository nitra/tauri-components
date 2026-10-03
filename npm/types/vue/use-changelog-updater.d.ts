/**
 * Зміни між поточною й новою версією з changelog.json; при будь-якій помилці — порожньо
 * (діалог оновлення все одно покажеться, лише без опису).
 * @param {typeof globalThis.fetch} fetchImpl - fetch
 * @param {string} changelogUrl - changelog.json останнього релізу
 * @param {string} current - поточна версія
 * @param {string} next - нова версія
 * @returns {Promise<import('../app/changelog.js').ChangelogEntry[]>} версії, новіші зверху
 */
export function loadChanges(fetchImpl: typeof globalThis.fetch, changelogUrl: string, current: string, next: string): Promise<import("../app/changelog.js").ChangelogEntry[]>;
/**
 * Підключає перевірку оновлень до компонента.
 * @param {{ changelogUrl: string }} options - changelogUrl: `<artifact>/latest/changelog.json` застосунку
 * @returns {void}
 */
export function useChangelogUpdater({ changelogUrl }: {
    changelogUrl: string;
}): void;
