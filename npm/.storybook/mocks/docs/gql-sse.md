---
type: JS Module
title: gql-sse.js
resource: npm/.storybook/mocks/gql-sse.js
docgen:
  crc: 36691017
  model: openai-codex/gpt-5.4-mini
  tier: cloud-min
  score: 100
  issues: judge:inaccurate:0.93
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

Канонічний MSW-хелпер для мокання Apollo GraphQL-підписок через `graphql-sse` у distinct-connection режимі: кожна подія виконання підписки надсилається окремим SSE `next`-записом у форматі `event: next\ndata: …`. Це єдине джерело істини для цього wire-протоколу — не переносити копію логіки в кожен пакет окремо.

## Поведінка

1. `sseSubscription` перетворює послідовність результатів GraphQL-підписки на SSE-стрім для MSW-відповіді, щоб Storybook міг відтворювати події підписки через `graphql-sse`.
2. Для кожного отриманого результату вона формує окрему `next`-подію в wire-протоколі `graphql-sse`, щоб кожен execution-result доставлявся як самостійний запис потоку.
3. Вона завершує потік після відправлення всіх подій, щоб мок поводився як завершене джерело даних у distinct-connection режимі.
4. Вона не змінює дані та не звертається до ФС чи БД; єдина її відповідальність — підготувати коректне SSE-представлення для подальшої передачі через network-layer.

## Публічний API

- sseSubscription — Формує SSE-стрім тіла відповіді для MSW-хендлера підписки graphql-sse.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
