---
type: Rust Module
title: build.rs
resource: tauri-plugin-agent/build.rs
docgen:
  crc: 605cf916
  model: omlx/gemma-4-e4b-it-OptiQ-4bit
  score: 100
  issues: judge:inaccurate:0.98
  judgeModel: openai-codex/gpt-5.4-mini
---

## Огляд

Створює файли дозволів для кожної команди та генерує схему дозволів для плагіна. Механізм дозволяє кінцевим застосункам встановлювати загальний дозвіл `agent:default`.

## Поведінка

1. Генерує файли дозволів для кожного команди.
2. Генерує схему дозволів плагіна.
3. Дозволяє кінцевим застосункам надавати загальний дозвіл `agent:default`.

## Гарантії поведінки

- Read-only: не виконує операцій запису (ФС/БД).
