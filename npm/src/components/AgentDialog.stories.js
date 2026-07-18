import { ref } from 'vue'
import AgentDialog from './AgentDialog.vue'

/**
 * Мокований `agent`-gateway (форма з `useAgent()` хост-застосунку) — без реального omlx/Tauri виклику.
 * @returns {object} мок, сумісний з деструктуризацією `AgentDialog.vue`
 */
function mockAgent() {
  return {
    baseUrl: ref('http://localhost:11434'),
    model: ref('gemma-4-e4b-it'),
    apiKey: ref(''),
    saveOmlx: () => null,
    loadOmlxEnv: () => null,
    listModels: () => ['gemma-4-e4b-it', 'llama-3-8b'],
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
