import { invoke } from '@tauri-apps/api/core'

// UI transport: route a tool call to its Tauri command. Input keys map 1:1 to
// the command's args (already camelCase, e.g. tasksDir). Each consumer app
// implements the named `tool.tauri` commands in its Rust backend.

/**
 * @param {object} tool tool definition (uses `tool.tauri`)
 * @param {object} input tool input, forwarded as command args
 * @returns {Promise<unknown>} the command result
 */
export function tauriTransport(tool, input) {
  return invoke(tool.tauri, input)
}
