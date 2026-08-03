/** Host catalog id for the MVP Vue A2UI renderer. */
export const CATALOG_NITRA_CORE: 'nitra.core'
/** Component names implemented by the host renderer. */
export const NITRA_CORE_COMPONENTS: readonly string[]
export function resolveDynamicString(value: unknown, dataModel?: Record<string, unknown>): string
export function indexComponents(components: Record<string, object> | object[]): Map<string, object>
