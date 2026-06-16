// `@7n/tauri-components/components` — Quasar dialogs for the agent. AgentDialog
// and AuditDialog take the injected `agent` gateway (from ./vue useAgent) via a
// prop; the rest are pure props-only building blocks. Requires the host app to
// provide vue + quasar (peer deps) and to have Quasar installed.

export { default as AgentDialog } from './AgentDialog.vue'
export { default as AuditDialog } from './AuditDialog.vue'
export { default as BaseDialog } from './BaseDialog.vue'
export { default as DialogActions } from './DialogActions.vue'
export { default as RequestView } from './RequestView.vue'
