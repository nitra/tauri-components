<template>
  <div class="req-view">
    <StatePill :status="result.status" />

    <div v-if="result.summary" class="req-summary">{{ result.summary }}</div>
    <div v-if="result.question" class="req-summary">{{ result.question }}</div>
    <div v-if="result.error" class="req-error">{{ result.error }}</div>

    <div v-if="result.actions?.length" class="req-actions">
      <div v-for="(action, i) in result.actions" :key="i" class="req-action">
        <q-icon
          :name="action.envelope?.ok ? 'sym_o_check_circle' : 'sym_o_error'"
          :color="action.envelope?.ok ? 'positive' : 'negative'"
          size="14px" />
        <code>{{ action.tool }}({{ JSON.stringify(action.input) }})</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatePill from './StatePill.vue'

defineProps({
  result: { type: Object, required: true }
})
</script>

<style scoped>
.req-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.req-summary {
  line-height: 1.5;
  white-space: pre-wrap;
  font-size: 13px;
}

.req-error {
  color: #ff6b60;
  font-size: 13px;
}

.req-actions {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.req-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace;
  font-size: 11px;
  opacity: 0.8;
  overflow-wrap: anywhere;
}
</style>
