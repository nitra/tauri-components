import { ref } from 'vue'
import AgentDialog from './AgentDialog.vue'

/**
 * Мокований `agent`-gateway (форма з `useAcpAgent()` хост-застосунку) — без реального ACP/Tauri виклику.
 * @returns {object} мок, сумісний з деструктуризацією `AgentDialog.vue`
 */
function mockAgent() {
  return {
    agentKind: ref('codex'),
    modelTier: ref('AVG'),
    availableAgentKinds: ref(['codex', 'claude']),
    availableTiers: ref([
      { id: 'MIN', label: 'MIN' },
      { id: 'AVG', label: 'AVG' },
      { id: 'MAX', label: 'MAX' }
    ]),
    loadEnv: () => Promise.resolve(),
    request: text => ({ status: 'done', summary: `Echo: ${text}` }),
    respond: (_requestId, text) => ({ status: 'done', summary: `Follow-up echo: ${text}` })
  }
}

export default {
  title: 'Components/AgentDialog',
  component: AgentDialog,
  args: { modelValue: true, agent: mockAgent() }
}

export const Default = {}
