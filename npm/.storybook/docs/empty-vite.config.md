---
type: JS Module
title: empty-vite.config.js
resource: npm/.storybook/empty-vite.config.js
docgen:
  crc: 5c9f8904
  model: openai-codex/gpt-5.4-mini
  tier: cloud-min
  score: 90
  issues: surzhik,judge:inaccurate:0.98
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

Канонічний порожній Vite-конфіг — стенд-ін для `core.builder.options.viteConfigPath` у `.storybook/main.js`. Він не дає `@storybook/builder-vite` через `loadConfigFromFile` автоматично підхопити пакетний `vite.config.js` і домерджити його нефільтровані плагіни ще до `viteFinal`; далі `mergeConfig` просто конкатенує `plugins`, тож фільтр у `viteFinal` не прибирає вже змерджений дублікат. Саме тому `storybook build` падає на кожному `.vue` з `At least one <template> or <script> is required` через подвійну SFC-трансформацію, тоді як `dev --smoke-test` цього не ловить. `npx @7n/rules fix storybook` відновлює цей файл, якщо його видалено або зламано канон.

## Поведінка

1. Забезпечує канонічний порожній Vite-конфіг як опорну точку для Storybook у Vue-компонентних бібліотеках.
2. Дає `storybook`-збірці явний шлях до Vite-конфігу, щоб builder не підхоплював пакетний `vite.config.js` із зайвими плагінами.
3. Усуває ризик подвійної SFC-трансформації під час `storybook build`, коли `.vue`-файли падають на некоректній обробці шаблонів або скриптів.
4. Підтримує відтворюваність канону: якщо файл видалити або зламати, `npx @7n/rules fix storybook` відновлює очікуваний стан.
5. Не покладається на `dev --smoke-test` для виявлення цієї проблеми, бо вона проявляється саме на повному `build`.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
