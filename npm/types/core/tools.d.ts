/**
 * Look up a tool by name in a catalog.
 * @param {object[]} catalog tool definitions
 * @param {string} name tool name
 * @returns {object|null} the tool definition, or null if unknown
 */
export function getTool(catalog: object[], name: string): object | null
