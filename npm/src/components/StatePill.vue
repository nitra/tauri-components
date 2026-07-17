<template>
  <span class="state-pill" :style="{ '--c': statusColor(status) }">
    <span class="state-pill__dot" />
    {{ status }}
  </span>
</template>

<script setup>
// The colored status chip used by RequestView and AuditDialog. Owns the pill
// markup + styles in one place (the color map lives in status.js).
import { statusColor } from './status.js'

defineProps({
  status: { type: String, required: true }
})
</script>

<style scoped>
.state-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  flex: 0 0 auto;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  font-family: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
}

.state-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c);
}
</style>
