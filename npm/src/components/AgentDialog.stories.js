import { ref } from 'vue'
import AgentDialog from './AgentDialog.vue'

/**
 * Мокований `agent`-gateway (форма з `useAcpAgent()` хост-застосунку) — без реального ACP/Tauri виклику.
 * @returns {object} мок, сумісний з деструктуризацією `AgentDialog.vue`
 */
function mockAgent() {
  return {
    agentKind: ref('codex'),
    modelTier: ref('avg'),
    availableAgentKinds: ref(['cursor', 'codex', 'pi']),
    availableTiers: ref([
      { id: 'min', label: 'GPT-5.6 Luna' },
      { id: 'avg', label: 'GPT-5.6 Terra' },
      { id: 'max', label: 'GPT-5.6 Sol' }
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
