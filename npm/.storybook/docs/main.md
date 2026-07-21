---
type: JS Module
title: main.js
resource: npm/.storybook/main.js
docgen:
  crc: a8348b2d
  model: openai-codex/gpt-5.4-mini
  score: 100
  issues: judge:inaccurate:0.98
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

Storybook у цьому пакеті показує Vue 3 stories з `src/components` і дає окреме середовище для перегляду компонентів під час розробки. Він потрібен, щоб перевіряти стан UI без запуску повного застосунку та тримати stories поруч із компонентами, які вони описують.

## Поведінка

1. Storybook запускає Vue 3 stories із `src/components` у межах `npm`-пакета.
2. Для preview та visual testing підключається `@storybook/addon-vitest`.
3. Під час збірки Storybook додає Vue Vite plugin, щоб компоненти коректно оброблялися у середовищі без окремого `vite.config`.
4. Налаштування працює без запису у файлову систему чи базу даних.
5. Конфіг не покладається на наявність app-level Vite-конфігурації в цьому пакеті.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
