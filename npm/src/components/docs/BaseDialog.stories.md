---
type: JS Module
title: BaseDialog.stories.js
resource: npm/src/components/BaseDialog.stories.js
docgen:
  crc: 04bd2c30
  model: openai-codex/gpt-5.4-mini
  tier: cloud-min
  score: 100
  issues: judge:inaccurate:0.97
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

`Default` і `NoIcon` описують очікувану поведінку компонента в двох станах: зі звичайним відображенням і без іконки в заголовку.

## Поведінка

- Default — показує базовий приклад діалогу з текстом у тілі та вмістом у слоті дій.
- NoIcon — показує діалог без іконки в заголовку, коли її значення порожнє.

## Публічний API

- Default — базовий публічний варіант компонента.
- NoIcon — публічний варіант без іконки; використовують, коли потрібен той самий базовий вигляд, але без візуального елемента іконки.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
