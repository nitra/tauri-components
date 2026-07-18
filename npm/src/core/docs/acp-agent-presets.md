---
type: JS Module
title: acp-agent-presets.js
resource: npm/src/core/acp-agent-presets.js
docgen:
  crc: 5f41e5f2
---

## Огляд

Модуль надає готовий, спільний для всіх застосунків-споживачів пресет запуску codex-агента через ACP (`CODEX_ACP_AGENT_PRESET`) — для `useAcpAgent()`/`createAcpAgentKit()`, щоб кожен застосунок не визначав команду спавну й тіри моделі codex окремо. Read-only, лише статичні дані — жодних мережевих викликів чи запису.

## Поведінка

`CODEX_ACP_AGENT_PRESET` задає команду спавну справжнього опублікованого адаптера `@agentclientprotocol/codex-acp` (не існуючої як пакет голої назви `codex-acp`) через `npx`, і три тіри моделі — `MIN`/`AVG`/`MAX` — за внутрішньою схемою назв релізів codex (`gpt-5.6-luna`/`gpt-5.6-terra`/`gpt-5.6-sol`). Кожен тір передає обрану модель через змінну середовища `CODEX_CONFIG` (JSON, що codex-acp зливає в конфіг сесії) — діє лише на одну спавнену сесію, нічого не зберігається постійно.

## Публічний API

CODEX_ACP_AGENT_PRESET — готовий об'єкт `{command, args, tiers}` для передачі в `useAcpAgent({agents: {codex: CODEX_ACP_AGENT_PRESET}})`.

## Гарантії поведінки

- Read-only: лише статичні дані, жодних операцій запису чи мережевих викликів.
