/**
 * @param {object} tool tool definition (uses `tool.tauri`)
 * @param {object} input tool input, forwarded as command args
 * @returns {Promise<unknown>} the command result
 */
export function tauriTransport(tool: object, input: object): Promise<unknown>;
