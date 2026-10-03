<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="update-dialog">
      <q-card-section>
        <div class="text-h6">Доступне оновлення</div>
        <div class="text-body2 text-grey">{{ current }} → {{ version }}</div>
      </q-card-section>

      <q-card-section v-if="changes.length" class="changes q-pt-none scroll">
        <div v-for="entry in changes" :key="entry.version" class="q-mb-md">
          <div class="text-subtitle1 text-weight-medium">
            {{ entry.version }}
            <span v-if="entry.date" class="text-caption text-grey q-ml-xs">{{ versionDate(entry.date) }}</span>
          </div>
          <div v-for="section in entry.sections" :key="section.title" class="q-mt-xs">
            <div class="text-caption text-uppercase text-grey">{{ sectionTitle(section.title) }}</div>
            <ul class="q-my-xs q-pl-md">
              <li v-for="(item, index) in section.items" :key="index">
                <template v-for="(part, i) in inlineCode(item)" :key="i">
                  <code v-if="part.code">{{ part.text }}</code>
                  <template v-else>{{ part.text }}</template>
                </template>
              </li>
            </ul>
          </div>
        </div>
      </q-card-section>

      <q-card-section v-else class="q-pt-none text-grey">Опис змін недоступний.</q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Пізніше" @click="onDialogCancel" />
        <q-btn color="primary" label="Встановити" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from 'quasar'

defineProps({
  /** Поточна версія застосунку */
  current: { type: String, required: true },
  /** Нова версія */
  version: { type: String, required: true },
  /** Версії між поточною й новою (changesBetween), новіші зверху */
  changes: { type: Array, default: () => [] }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

/** @type {Record<string, string>} заголовки секцій Keep a Changelog українською */
const SECTION_TITLES = { Added: 'Додано', Changed: 'Змінено', Fixed: 'Виправлено', Removed: 'Видалено' }

/**
 * Заголовок секції українською (невідомі — як є).
 * @param {string} title - секція з CHANGELOG.md
 * @returns {string} заголовок
 */
function sectionTitle(title) {
  return SECTION_TITLES[title] ?? title
}

/**
 * Дата версії словами: «1 жовтня».
 * @param {string} date - YYYY-MM-DD
 * @returns {string} дата
 */
function versionDate(date) {
  const parsed = new Date(`${date}T00:00:00`)
  const year = parsed.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }
  return parsed.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', ...year })
}

/**
 * Розбиває пункт на текст і `inline code` (без v-html).
 * @param {string} text - пункт changelog
 * @returns {{ text: string, code: boolean }[]} частини
 */
function inlineCode(text) {
  return text.split('`').map((part, index) => ({ text: part, code: index % 2 === 1 }))
}
</script>

<style scoped>
.update-dialog {
  width: 560px;
  max-width: 90vw;
}

.changes {
  max-height: 55vh;
}
</style>
