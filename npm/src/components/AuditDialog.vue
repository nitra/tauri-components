<template>
  <BaseDialog
    @update:model-value="val => emit('update:modelValue', val)"
    @show="refresh"
    :model-value="modelValue"
    title="Request journal"
    icon="sym_o_history"
    :width="680"
    body-class="">
    <template #header>
      <q-btn @click="refresh" icon="sym_o_refresh" flat round dense size="sm" :loading="loading" title="Refresh" />
    </template>

    <div v-if="!records.length && !loading" class="audit-empty">No requests yet</div>

    <div v-for="rec in records" :key="rec.id" class="audit-row">
      <div @click="toggle(rec.id)" class="audit-head">
        <StatePill :status="rec.status" />
        <span class="audit-actor">{{ rec.actor?.kind }}{{ rec.actor?.id ? `:${rec.actor.id}` : '' }}</span>
        <span class="audit-intent">{{ rec.intent }}</span>
        <q-space />
        <span class="audit-time">{{ fmtTime(rec.createdAt) }}</span>
      </div>

      <div v-if="expandedId === rec.id" class="audit-body">
        <RequestView @respond="msg => onRespond(rec, msg)" :result="rec" :busy="busyId === rec.id" />
        <div v-if="rec.status === 'needs_approval' && rec.pendingApproval" class="audit-approval">
          <div v-if="rec.pendingApproval.kind === 'acp'" class="audit-pending">
            Permission request:
            <code>{{ rec.pendingApproval.toolCall?.title ?? rec.pendingApproval.toolCall?.toolCallId }}</code>
          </div>
          <div v-else class="audit-pending">
            Approve action: <code>{{ rec.pendingApproval.tool }}({{ JSON.stringify(rec.pendingApproval.input) }})</code>
          </div>
          <div class="row q-gutter-sm">
            <q-btn
              @click="onApprove(rec, true)"
              label="Підтвердити"
              color="negative"
              unelevated
              no-caps
              :loading="busyId === rec.id" />
            <q-btn @click="onApprove(rec, false)" label="Відхилити" flat no-caps :disable="busyId === rec.id" />
          </div>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import BaseDialog from './BaseDialog.vue'
import RequestView from './RequestView.vue'
import StatePill from './StatePill.vue'

// The agent gateway (journal + respond + approve) is injected by the host app,
// keeping this dialog domain-free.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  agent: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue', 'changed'])

const $q = useQuasar()
const { journal, respond, approve } = props.agent

const records = ref([])
const loading = ref(false)
const expandedId = ref(null)
const busyId = ref(null)

/**
 * @param {number} millis epoch millis
 * @returns {string} locale time
 */
function fmtTime(millis) {
  return millis ? new Date(millis).toLocaleString() : ''
}

/**
 * Reload the journal list.
 */
async function refresh() {
  loading.value = true
  try {
    records.value = await journal.list()
  } catch (error) {
    $q.notify({ type: 'negative', message: String(error?.message ?? error) })
  } finally {
    loading.value = false
  }
}

/**
 * @param {string} id record id to expand/collapse
 */
function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}

/**
 * Answer a pending clarification on a journaled request, then refresh.
 * @param {object} rec the record
 * @param {string} message the human's answer
 */
async function onRespond(rec, message) {
  busyId.value = rec.id
  try {
    await respond(rec.id, message)
    await refresh()
    emit('changed')
  } catch (error) {
    $q.notify({ type: 'negative', message: String(error?.message ?? error) })
  } finally {
    busyId.value = null
  }
}

/**
 * Approve or reject a pending destructive action, then refresh.
 * @param {object} rec the record
 * @param {boolean} ok true to approve (execute), false to reject
 */
async function onApprove(rec, ok) {
  busyId.value = rec.id
  try {
    await approve(rec.id, ok)
    await refresh()
    emit('changed')
  } catch (error) {
    $q.notify({ type: 'negative', message: String(error?.message ?? error) })
  } finally {
    busyId.value = null
  }
}
</script>

<style scoped>
.audit-empty {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  opacity: 0.4;
}

.audit-approval {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, #ff9f0a 12%, transparent);
}

.audit-pending {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.audit-row {
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.body--light .audit-row {
  border-bottom-color: rgb(0 0 0 / 7%);
}

.audit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
}

.audit-head:hover {
  background: rgb(255 255 255 / 5%);
}

.body--light .audit-head:hover {
  background: rgb(0 0 0 / 4%);
}

.audit-actor {
  font-family: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace;
  font-size: 11px;
  opacity: 0.6;
  flex: 0 0 auto;
}

.audit-intent {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}

.audit-time {
  font-size: 11px;
  opacity: 0.4;
  flex: 0 0 auto;
}

.audit-body {
  padding: 6px 4px 12px;
}
</style>
