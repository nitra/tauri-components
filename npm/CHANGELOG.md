# Changelog

## [0.11.0] - 2026-07-17

### Removed

- useAgent()/createAgentKit (omlx/runAgent chat-completion шлях) видалено — `useAcpAgent()`/`createAcpAgentKit` (ACP: спавн codex/claude/cursor/pi) тепер єдиний агентний шлях. Разом з ним прибрано `core/llm.js`, `core/agent-handler.js`, `core/omlx-models.js`, `core/resolve-omlx-base-url.js`, `vue/use-omlx.js` та Rust-команду `omlx_config` (tauri-plugin-agent)

## [0.10.1] - 2026-07-16

### Changed

- chore(lint): дозаповнено cspell-словник, авто-fix markdownlint у docs/

## [0.10.0] - 2026-07-16

### Added

- core/acp-agent-presets.js — CODEX_ACP_AGENT_PRESET: спільний для всіх застосунків-споживачів пресет запуску codex через ACP (npx @agentclientprotocol/codex-acp — гола назва "codex-acp" не опублікована), MIN/AVG/MAX тіри за схемою назв релізів codex (gpt-5.6-luna/terra/sol) через CODEX_CONFIG. Експортовано з npm/src/index.js.

## [0.9.0] - 2026-07-15

### Added

- core/acp-agent.js — ACP-сесії (spawn/prompt/cancel), стрім session/update у форму runAgent(), перший крок міграції з прямих omlx-викликів на Agent Client Protocol
- core/acp-kit.js — ACP-версія createAgentKit: класифікація/dispatch домен-каталогу через MCP tools/call (acp://mcp-tool-call), дзеркалення нативних ACP permission-request у той самий pendingApproval-контракт, що і approve()/AuditDialog вже розуміють. Одна активна сесія за раз.
- vue/use-acp-agent.js — Vue-composабл useAcpAgent(): резолвинг дефолтного агента через ACP_DEFAULT_AGENT (per-машина), MIN/AVG/MAX модель-тіри на пресет (per-агент), запуск domain MCP-моста при loadEnv(). Паралельний до useAgent(), старий шлях не чіпали.

## [0.8.0] - 2026-07-05

### Added

- useUpdater() у @7n/tauri-components/vue — спільна перевірка/встановлення оновлень через tauri-plugin-updater з Quasar-діалогом, винесена з mlmail/myshare/myllm/task (усі чотири мали ідентичну копію).

## [0.7.0] - 2026-07-02

### Added

- Фолбек на myllm-проксі: loadEnv() у useOmlx пробує `:8088/health` (timeout 400ms, кеш 12с) і, коли проксі живий, веде трафік через нього замість прямого `:8000` — runtime-only override, localStorage і кастомні baseUrl не чіпаються. Нові core-експорти: resolveOmlxBaseUrl / resolveOmlxBaseUrlCached / isDirectOmlxUrl / DIRECT_OMLX_BASE_URL / PROXY_OMLX_BASE_URL.

## [0.6.0] - 2026-06-22

### Changed

- Додано пропс promptHint до AgentDialog.vue

## [0.5.0] - 2026-06-19

### Added

- testing subpath (mountQuasar/mountWithQuasar vitest helpers); omlx model listing (listOmlxModels/resolveModel) + a model dropdown in AgentDialog populated from the server

## [0.4.1] - 2026-06-19

### Fixed

- useOmlx no longer crashes when localStorage is unavailable (component tests / SSR) — guarded reads/writes

## [0.4.0] - 2026-06-19

### Added

- createDispatch preserves a backend error.kind on the io envelope; useAgent accepts a transport override (route some tools to JS/OPFS handlers)

## [0.3.0] - 2026-06-16

### Changed

- Винесено логіку відображення статусу в StatePill компонент

## [0.2.0] - 2026-06-16

### Changed

- journal/omlx commands now invoked as plugin:agent|* — apps must register tauri-plugin-agent and grant agent:default

## [0.1.1] - 2026-06-16

### Fixed

- npm provenance: add repository metadata so publish passes sigstore validation

## [0.1.0] - 2026-06-16

### Added

- LLM agent engine (createAgentKit, scoped tool surface) + Vue/Quasar UI (AgentDialog, AuditDialog) for Tauri apps
