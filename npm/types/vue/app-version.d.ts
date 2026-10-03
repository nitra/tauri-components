/**
 * Чи це локальна збірка (tauri dev / tauri build --debug).
 * @returns {Promise<boolean>} true — не реліз
 */
export function isDevBuild(): Promise<boolean>;
/**
 * Версія для заголовка вікна: у локальній збірці 0.0.0, інакше з tauri.conf.json.
 * @returns {Promise<string>} версія
 */
export function displayVersion(): Promise<string>;
/** @type {string} версія, яку показує локальна збірка */
export const DEV_VERSION: string;
