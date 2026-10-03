/**
 * Resolve a dynamic A2UI string (literal | {path} | other) against a data model.
 * MVP: only plain strings and `{ path }` bindings; function calls return empty.
 * @param {unknown} value
 * @param {Record<string, unknown>} dataModel
 * @returns {string}
 */
export function resolveDynamicString(value: unknown, dataModel?: Record<string, unknown>): string;
/**
 * Build an id → component map from a surface state's components object or array.
 * @param {Record<string, object>|object[]} components
 * @returns {Map<string, object>}
 */
export function indexComponents(components: Record<string, object> | object[]): Map<string, object>;
/** @see ./docs/catalog.md */
/** Host catalog id for the MVP Vue A2UI renderer. */
export const CATALOG_NITRA_CORE: "nitra.core";
/** Component names implemented by the host renderer. */
export const NITRA_CORE_COMPONENTS: readonly string[];
