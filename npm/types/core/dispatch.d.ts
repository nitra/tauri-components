/**
 * Validate an input object against a tool's schema and custom validator.
 * @param {object} tool tool definition
 * @param {object} [input] candidate input
 * @returns {string|null} error message, or null when valid
 */
export function validateInput(tool: object, input?: object): string | null
/**
 * Build a dispatch function bound to a catalog and a transport.
 * @param {object[]} catalog tool definitions
 * @param {(tool: object, input: object) => unknown} transport runs the tool's backend call
 * @returns {(name: string, input?: object) => Promise<object>} dispatch returning an envelope
 */
export function createDispatch(
  catalog: object[],
  transport: (tool: object, input: object) => unknown
): (name: string, input?: object) => Promise<object>
