---
type: JS Module
title: StatePill.stories.js
resource: npm/src/components/StatePill.stories.js
docgen:
  crc: 771e771a
  model: openai-codex/gpt-5.4-mini
  tier: cloud-min
  score: 100
  issues: judge:inaccurate:0.99
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

`Pending`, `Running`, `Done`, `Partial`, `NeedsApproval`, `Failed`, `Rejected` — це стандартні стани виконання для узгодженого позначення очікування, роботи, завершення, часткового завершення, потреби в підтвердженні, помилки та відхилення.

Файл read-only і не пише у ФС або БД.

## Поведінка

- Pending — показує стан очікування.
- Running — показує стан виконання.
- Done — показує завершений стан.
- Partial — показує частково завершений стан.
- NeedsApproval — показує стан, що потребує підтвердження.
- Failed — показує стан помилки.
- Rejected — показує відхилений стан.

## Публічний API

- Pending: стан для задачі до початку виконання
- Running: стан для задачі під час виконання
- Done: стан для повністю завершеної задачі без помилок
- Partial: стан для задачі, де завершено лише частину роботи
- NeedsApproval: стан для задачі, що чекає на підтвердження перед продовженням
- Failed: стан для задачі, що завершилась помилкою
- Rejected: стан для результату, який не прийняли як придатний

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
