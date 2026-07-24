/**
 * Convert a tool input spec into a JSON Schema object.
 * @param {Record<string, {type: string, required?: boolean, description?: string}>} input tool input spec
 * @returns {object} JSON Schema for the parameters object
 */
export function toJsonSchema(
  input: Record<
    string,
    {
      type: string
      required?: boolean
      description?: string
    }
  >
): object
/**
 * OpenAI function-calling tool definitions, optionally filtered (e.g. by scope).
 * @param {object[]} catalog tool definitions
 * @param {(tool: object) => boolean} [allow] predicate; default includes all tools
 * @returns {object[]} OpenAI `tools` array
 */
export function toolManifest(catalog: object[], allow?: (tool: object) => boolean): object[]
/**
 * Compact catalog listing (name + summary).
 * @param {object[]} catalog tool definitions
 * @returns {{name: string, summary: string}[]} tool list
 */
export function listTools(catalog: object[]): {
  name: string
  summary: string
}[]
