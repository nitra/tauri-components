---
docgen:
  source: npm/src/testing/quasar.js
  crc: 154223d8
  model: omlx/gemma-4-e4b-it-OptiQ-4bit
  score: 100
  judgeModel: openai-codex/gpt-5.4-mini
---

# quasar.js

## Огляд

Модуль надає механізми для ініціалізації компонентів Vue у застосунок. Доступні два способи: пряме монтування компонента з використанням компонентів Quasar через `mountQuasar`, або монтування компонента, який автоматично інкапсулюється у стандартну структуру макету Quasar за допомогою `mountWithQuasar`. Модуль не виконує операцій запису у файлову систему чи базу даних.

## Поведінка

mountQuasar монтує компонент Vue з зареєстрованими компонентами Quasar, не обгортаючи його у макет.
mountWithQuasar монтує компонент Vue, обгорнувши його у структуру QLayout > QPageContainer.

## Публічний API

mountQuasar — Монтує компонент з зареєстрованим Quasar без обгортки макета.
mountWithQuasar — Монтує компонент рівня сторінки, обгорнутий у QLayout > QPageContainer.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
