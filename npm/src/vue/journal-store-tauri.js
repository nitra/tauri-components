import { invoke } from '@tauri-apps/api/core'

// Webview journal store: routes journal FS through Rust Tauri commands
// (journal_*), provided by the shared `tauri-plugin-agent` (see SPEC §6). Same
// shape any other store implements, so agent-handler stays backend-agnostic.

/**
 * @returns {{ create: (r:object)=>Promise<string>, load: (id:string)=>Promise<object>, update: (id:string,patch:object)=>Promise<void>, list: ()=>Promise<object[]> }} journal store
 */
export function createTauriJournalStore() {
  return {
    create: ({ intent, actor }) => invoke('journal_create', { intent, actor }),
    load: id => invoke('journal_load', { id }),
    update: (id, patch) => invoke('journal_update', { id, patch }),
    list: () => invoke('journal_list'),
  }
}
