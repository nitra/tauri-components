import AuditDialog from './AuditDialog.vue'

/**
 * Мокований `agent`-gateway (journal + respond + approve) — без реального omlx/Tauri виклику.
 * @returns {object} мок, сумісний з деструктуризацією `AuditDialog.vue`
 */
function mockAgent() {
  const records = [
    { id: '1', status: 'done', actor: { kind: 'user' }, intent: 'Create task', createdAt: Date.now() - 60000 },
    {
      id: '2',
      status: 'needs_approval',
      actor: { kind: 'agent' },
      intent: 'Delete file ~/projects/mt/scratch.log',
      createdAt: Date.now(),
      pendingApproval: { tool: 'fs.delete', input: { path: '~/projects/mt/scratch.log' } }
    }
  ]
  return {
    journal: { list: () => records },
    respond: () => null,
    approve: () => null
  }
}

export default {
  title: 'Components/AuditDialog',
  component: AuditDialog,
  args: { modelValue: true, agent: mockAgent() }
}

export const Default = {}
