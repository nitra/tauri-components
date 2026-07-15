---
docgen:
  source: npm/stryker-vue-macros-ignorer.mjs
  crc: 30a5e9f9
  model: omlx/gemma-4-e4b-it-OptiQ-4bit
  score: 100
  judgeModel: openai-codex/gpt-5.4-mini
---

# stryker-vue-macros-ignorer.mjs

## Огляд

Плагін ігнорує мутації, згенеровані викликами макросів Vue `<script setup>` (`defineProps`, `defineEmits`, `defineModel`, `defineSlots`, `defineExpose`, `defineOptions`). Це необхідно, оскільки стандартний Stryker обгортає аргументи цих макросів у тернарний coverage-вираз. Такий підхід призводить до помилки `@vue/compiler-sfc`: `defineProps in <script setup> cannot reference locally declared variables`, оскільки макроси вимагають статичного аналізу на етапі `compile-sfc`. Активація цього плагіна через `stryker.config.mjs` та встановлення `ignorers: ['vue-macros']` дозволяє уникнути цієї помилки.

## Поведінка

shouldIgnore повертає повідомлення, яке вказує на необхідність пропуску мутації виклику Vue `<script setup>`-макроса, якщо цей виклик відповідає визначеному списку макросів.
strykerPlugins надає конфігурацію плагіна для Stryker, що дозволяє активувати ігнорування мутацій для Vue-макросів.

## Публічний API

shouldIgnore — визначає, чи слід ігнорувати мутації виклику Vue `<script setup>`-макросів.
strykerPlugins — експортує список плагінів, які додаються до Stryker для ігнорування Vue макросів.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
