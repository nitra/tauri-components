# Changelog

## [0.13.8] - 2026-07-20

### Fixed

- AgentDialog: дайджест контексту при перемиканні агента тепер явно позначає репліки попереднього агента як чужі — раніше модель могла на ідентифікаційне питання ('що ти за модель') відповісти самоописом попереднього агента, побачивши його 'Я — Codex...' у контексті

## [0.13.7] - 2026-07-20

### Fixed

- acp_spawn_agent тепер чекає на реальний успіх/провал initialize+session/new перед поверненням session key (усуває гонку з acp_prompt, яка проявлялась як незрозуміла 'dropped the reply channel'); request() у acp-kit.js журналить провал спавну сесії як 'failed' замість непійманого throw

## [0.13.6] - 2026-07-20

### Changed

- AgentDialog: перемикання агента mid-conversation тепер зберігає видимий чат-лог і передає новому агенту текстовий дайджест попередньої розмови як контекст, замість повного скидання

## [0.13.5] - 2026-07-20

### Fixed

- acp-kit: помилка невдалого запиту (error) тепер повертається в UI-конверт, а не лише пишеться в journal — RequestView більше не показує порожній 'failed' без пояснення

## [0.13.4] - 2026-07-20

### Fixed

- AgentDialog: зміна агента/tier під час активної розмови перезапускає розмову на новообраному агенті замість мовчазного продовження зі старим

## [0.13.3] - 2026-07-20

### Fixed

- npm-publish CI: прибрано дубльований, зламаний другий release-крок (зайвий checkout скидав `node_modules`, тож `bunx n-rules` резолвився у сторонній однойменний пакет замість локального `@7n/rules` — release/publish уже встигали відпрацювати в першому проході, другий лише псував статус run). Одна канонічна послідовність checkout(persist-credentials: false)→push-auth→release→publish.

## [0.13.2] - 2026-07-20

### Changed

- release: @7n/tauri-components@0.13.1

## [0.13.1] - 2026-07-20

### Fixed

- AgentDialog.vue: ховає q-select tier, коли в обраного агента взагалі нема тірів (напр. pi) — раніше лишався видимим зі stale-значенням попереднього агента

## [0.13.0] - 2026-07-20

### Added

- AgentDialog.vue: мітка агент·модель над кожною відповіддю в чаті — фіксується на request(), не змінюється для наступних respond() у тій самій розмові (перемикання агента/тіру діє лише на нову сесію)

### Fixed

- useAcpAgent(): перемикання agent у picker більше не лишає modelTier зі значенням попереднього агента (напр. cursor's AVG="Grok 4.5" після переключення на pi, де тірів взагалі нема) — тепер watch(agentKind) перерезолвлює modelTier під новий агент

## [0.12.0] - 2026-07-20

### Added

- Storybook (Vue3 + Vite) для компонентів `npm/src/components/` — конфіг у
`npm/.storybook/`, по одному `*.stories.js` на компонент (`BaseDialog`,
`DialogActions`, `StatePill`, `RequestView`, `AgentDialog`, `AuditDialog`), і
named vitest-проєкт `"storybook"` (`@storybook/addon-vitest`, browser mode,
Playwright Chromium) поряд з canonical `"unit"`-проєктом у `npm/vitest.config.mjs`
— вмикає окремий вимір покриття `Vue (Storybook)` через `@7n/test coverage`.

### Changed

- docs(changelog): додано change-файл для поточних змін у npm workspace
- chore(lint): дозаповнено cspell-словник, авто-fix markdownlint у docs/

## [0.11.2] - 2026-07-19

### Changed

- feat(storybook): Vue Storybook setup for npm components (#5)

## [0.11.1] - 2026-07-18

### Changed

- rules

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
