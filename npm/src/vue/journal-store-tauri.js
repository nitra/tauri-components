import { invoke } from '@tauri-apps/api/core'

// Webview journal store: routes journal FS through the shared `tauri-plugin-agent`
// commands (`plugin:agent|journal_*`, see SPEC §6). Same shape any other store
// implements, so createAcpAgentKit stays backend-agnostic. The host app must
// register the plugin and grant `agent:default`.

/**
 * @returns {{ create: (r:object)=>Promise<string>, load: (id:string)=>Promise<object>, update: (id:string,patch:object)=>Promise<void>, list: ()=>Promise<object[]> }} journal store
 */
export function createTauriJournalStore() {
  return {
    create: ({ intent, actor }) => invoke('plugin:agent|journal_create', { intent, actor }),
    load: id => invoke('plugin:agent|journal_load', { id }),
    update: (id, patch) => invoke('plugin:agent|journal_update', { id, patch }),
    list: () => invoke('plugin:agent|journal_list')
  }
}
