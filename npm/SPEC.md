# `@7n/tauri-components` — специфікація

> Публічний npm-пакет зі спільним LLM-агентом і його UI для Tauri+Vue+Quasar
> додатків. Витягується з `nitra/task`; споживачі — `task`, `mlmail`, `myshare`.

## 1. Мета

Винести **механізм спілкування з LLM** (агентний tool-calling loop, журнал запитів,
тир-скоуп довіри, людське підтвердження деструктивних дій) та **його UI**
(діалог чату, аудит, рендер результату) в один спільний пакет, щоб три додатки
не дублювали ні логіку, ні компоненти.

Стек у всіх трьох ідентичний (підтверджено): Bun workspaces + Tauri 2.11 +
Vue 3.5 + Quasar 2.20 + Vite. Це робить спільний пакет реалістичним без
адаптерів під різні фреймворки.

## 2. Ключовий архітектурний принцип: інверсія каталогу

У `task` майже весь агентний код **уже універсальний** — доменна прив'язка
зосереджена у двох місцях:

| Доменне (лишається в додатку)                | Універсальне (їде в пакет)                              |
| -------------------------------------------- | -------------------------------------------------------- |
| `tool/catalog.js` — перелік інструментів     | `core/acp-agent.js` — spawn/prompt/cancel зовнішнього ACP-агента |
| Presets для CLI (codex/claude/cursor/pi)     | `core/acp-kit.js` — `createAcpAgentKit`: request/respond/approve |
| Rust-команди інструментів (`scan_tasks`, …)  | `core/dispatch.js`, `scope.js`, `manifest.js`             |
| `task-create.js::validateTaskName`           | `core/transports.js` (Tauri invoke)                       |
|                                              | `vue/journal-store-tauri.js`                               |
|                                              | `vue/use-acp-agent.js`                                      |
|                                              | всі 5 компонентів                                          |

**Проблема:** зараз `manifest.js`, `scope.js`, `dispatch.js` статично імпортують
`catalog.js` як модуль-сінглтон. Пакет не може зашити в себе task-каталог.

**Рішення:** інвертувати залежність — каталог стає **аргументом**, а не імпортом.
Чисті функції без стану (`validateInput`, `toJsonSchema`) лишаються stateless і
експортуються напряму; каталог-залежні (`getTool`, `toolManifest`,
`scopedManifest`, `classify`, `createDispatch`) зв'язуються всередині фабрики
`createAcpAgentKit(config)`.

> Історична примітка: перша ітерація пакета мала власний chat-completion loop
> (`runAgent`/`createOpenAiChat` у `core/llm.js`, зв'язаний через
> `createAgentKit`/`useAgent()` й omlx-конфіг `use-omlx.js`). Цей шлях повністю
> видалено — єдиний агентний шлях тепер ACP (`createAcpAgentKit`/`useAcpAgent()`,
> §3.2–3.3), який спавнить зовнішній CLI-агент (codex/claude/cursor/pi) замість
> прямих HTTP-викликів до omlx-сервера.

## 3. Публічний API

Пакет має кілька entrypoint'ів (subpath exports), щоб додаток, що використовує
лише ядро (наприклад headless-оркестратор), не тягнув Vue/Quasar.

```jsonc
// npm/package.json → "exports"
{
  ".":        "./src/index.js",        // ядро (без Vue): tool surface + ACP agent kit
  "./vue":     "./src/vue/index.js",    // композабли (vue + tauri)
  "./components": "./src/components/index.js" // .vue компоненти (vue + quasar)
}
```

### 3.1 `@7n/tauri-components` (ядро, без Vue)

```js
// stateless, без каталогу
export function validateInput(tool, input) // → string|null
export function toJsonSchema(input)        // → JSON Schema

// ACP session driver (spawn/prompt/cancel зовнішнього агента + MCP-міст)
export { acpConfig, cancelAcpSession, createAcpSession, onAcpPermissionRequest,
         onAcpToolCall, respondAcpPermission, respondAcpToolCall, runAcpTurn,
         startAcpMcpBridge } // з core/acp-agent.js
export { CODEX_ACP_AGENT_PRESET } // з core/acp-agent-presets.js — готовий MIN/AVG/MAX пресет для codex

// фабрика, зв'язана з каталогом додатка
export function createAcpAgentKit(config) // див. 3.2
```

### 3.2 `createAcpAgentKit(config)` — серце інтеграції

```js
const kit = createAcpAgentKit({
  catalog,          // обов'язково: масив TOOLS додатка (форма як task/catalog.js) —
                    // проксується зовнішньому ACP-агенту через доменний MCP-міст
  transport,        // (tool, input) => Promise<unknown> — напр. tauriTransport;
                    // без нього kit chat-only (без доменних MCP tools)
  journal,          // store { create, load, update, list }
  actorTiers,       // optional: { human: 2, agent: 1 } (дефолт як зараз)
})

// kit повертає:
kit.request   // ({ intent, agent }) => envelope  — agent = createAcpSession-параметри (agentKind/command/args/env/cwd/…)
kit.respond   // ({ requestId, message }) => envelope — продовжує активну сесію
kit.approve   // ({ requestId, approve }) => envelope — вирішує MCP tool-call або нативний ACP permission-request
```

На відміну від старого `createAgentKit` (видалено), тут **не** ведеться власний
chat-completion loop: зовнішній ACP-агент (spawned процес) веде свій цикл сам і
робить доменні tool-calls через Rust-side MCP-міст — `kit` лише слухає
`acp://mcp-tool-call`/`acp://permission-request` й журналить результат. Активна
одна сесія за раз (`AgentDialog` і так веде одну живу розмову).

Доменний системний промпт більше не передається явно (`systemPrompt` видалено):
ACP-агент — це той самий CLI, яким користується розробник (codex/claude/cursor/
pi), і він читає контекст проєкту з `cwd` (напр. `AGENTS.md`/`CLAUDE.md`) так
само, як і в інтерактивній роботі.

### 3.3 `@7n/tauri-components/vue`

```js
export function useAcpAgent(config) // фабрика-композабл: будує kit + резолвинг
                                    // агента/тіру + journal (Tauri) + domain MCP-міст
```

```js
useAcpAgent({
  catalog,       // обов'язково: масив TOOLS додатка — передається у доменний MCP-міст
  agents,        // Record<'codex'|'claude'|'cursor'|'pi', { command, args?, env?, tiers }>
                // — presets запуску кожного агента; MIN/AVG/MAX тіри в tiers
  defaultTier,   // optional, дефолт 'AVG'
  cwd,           // обов'язково: робоча директорія сесії (абсолютний шлях)
  actorTiers,    // optional: max executable tier rank per actor kind
  transport,     // optional, дефолт tauriTransport
})
// → { agentKind, modelTier, defaultAgentKind, availableAgentKinds, availableTiers,
//     loadEnv, journal, request, respond, approve }
```

`loadEnv()` читає per-машинний дефолтний агент (`ACP_DEFAULT_AGENT` через
`acp_config()`) і запускає доменний MCP-міст один раз — викликати перед першим
`request()`, аналогічно до того, як стара `useOmlx().loadEnv()` резолвила
omlx base URL один раз. Додаток пише тонку обгортку:

```js
// app/src/composables/use-agent.js (у кожному додатку — кілька рядків)
import { useAcpAgent } from '@7n/tauri-components/vue'
import { CODEX_ACP_AGENT_PRESET } from '@7n/tauri-components'
import { catalog } from '../tool/catalog.js'
export const useAgent = () => useAcpAgent({ catalog, cwd: projectRoot, agents: { codex: CODEX_ACP_AGENT_PRESET } })
```

### 3.4 `@7n/tauri-components/components`

Експортує: `AgentDialog`, `AuditDialog`, `RequestView`, `BaseDialog`,
`DialogActions`.

**Контракт декаплінгу:** компоненти не викликають `useAcpAgent()` самі —
приймають уже зібраний агент через проп:

```vue
<AgentDialog v-model="open" :agent="agent" @ran="reload" />
```

де `const agent = useAcpAgent(config)` (обгортка з 3.3). Так компонент не знає
про каталог, тестується ізольовано, і додаток контролює конфіг. `AuditDialog`
аналогічно приймає `:agent`. `RequestView`/`BaseDialog`/`DialogActions` —
чисті (props-only).

## 4. Розкладка модулів пакета

```
npm/
├── package.json
├── SPEC.md                      ← цей файл
├── src/
│   ├── index.js                 # re-export core
│   ├── core/
│   │   ├── acp-agent.js         # createAcpSession/runAcpTurn/… — spawn/prompt/cancel зовнішнього ACP-агента
│   │   ├── acp-agent-presets.js # CODEX_ACP_AGENT_PRESET (MIN/AVG/MAX)
│   │   ├── dispatch.js          # createDispatch, validateInput (catalog → param)
│   │   ├── manifest.js          # toolManifest(catalog, allow), toJsonSchema
│   │   ├── scope.js             # classify(catalog, actorTiers, actor, name), scopedManifest
│   │   └── acp-kit.js           # createAcpAgentKit — зв'язує все вище + MCP-міст
│   ├── vue/
│   │   ├── index.js
│   │   ├── use-acp-agent.js     # фабрика-композабл
│   │   ├── transports.js        # tauriTransport
│   │   └── journal-store-tauri.js
│   └── components/
│       ├── index.js
│       ├── AgentDialog.vue      # :agent проп
│       ├── AuditDialog.vue      # :agent проп
│       ├── RequestView.vue
│       ├── BaseDialog.vue
│       └── DialogActions.vue
└── docs/                        # n-doc-files (.md поруч, як вимагає правило)
```

Тести (`*.test.js`) — поруч із кодом, виключаються негативними glob у `files`
(вимога `n-npm-module`).

## 5. Що інжектує кожен додаток

| Що                     | task                          | mlmail / myshare                   |
| ---------------------- | ----------------------------- | ---------------------------------- |
| `catalog.js`           | scan/workspaces/create/delete | свої mail/share інструменти        |
| `agents` (ACP presets) | codex/claude/cursor/pi команди| ті самі presets або свої           |
| `cwd`                  | корінь проєкту task           | корінь проєкту mlmail/myshare      |
| Rust-команди           | `scan_tasks`, `create_task`…  | свої `#[tauri::command]`           |

Форма каталогу не змінюється — це той самий масив об'єктів
`{ tier, name, summary, input, tauri, validate? }`, що в `task/catalog.js`.
Доменний промпт додаток більше не передає — ACP-агент читає контекст проєкту
з `cwd` (`AGENTS.md`/`CLAUDE.md`), а не з explicit `systemPrompt`-конфігу.

## 6. Rust-частина: Tauri-плагін

`journal_*` (create/load/update/list) раніше жили у `task/app/src-tauri/src/lib.rs`
і так само дублювалися б у трьох бекендах. Спільний JS викликає
`invoke('journal_create')` — якщо команди немає, впаде.

**Статус: реалізовано** — crate `tauri-plugin-agent/` у цьому ж репозиторії
реєструє команди `journal_*`, ACP-клієнтські команди (`acp_spawn_agent`,
`acp_prompt`, `acp_cancel`, `acp_respond_permission`, `acp_config`) і доменний
MCP-міст (`acp_register_catalog`, `acp_mcp_tool_result`, `acp_start_mcp_bridge`) —
всі інвокуються як `plugin:agent|…`. Тека журналу резолвиться з
`app_local_data_dir` додатка (без хардкоду bundle-id; override —
`AGENT_REQUESTS_DIR`). Кожен додаток робить `.plugin(tauri_plugin_agent::init())`
у білдері й грантить `agent:default` у capability (журнальні команди) —
і команди з'являються без копіпасти. JS-пакет (`createTauriJournalStore`,
`useAcpAgent`) уже викликає namespaced `plugin:agent|…`. Деталі —
`tauri-plugin-agent/README.md`.

> `omlx_config` — команда старого omlx/runAgent-шляху — видалена разом з
> `useAgent()`/`use-omlx.js` (див. CHANGELOG). ACP-агент не потребує окремого
> settings-файлу для вибору моделі: MIN/AVG/MAX резолвиться через `agents`-пресети
> (§3.3), а який CLI спавнити — через `ACP_DEFAULT_AGENT` (`acp_config()`).

> Crate **не** в npm-workspace, тож пуш у `main` його не публікує в npm —
> додатки тягнуть його як git-залежність у `Cargo.toml`.

- npm не може містити Rust → це **окремий артефакт**: crates.io або git-залежність
  у `Cargo.toml` кожного додатка.
- Розкладка: `/Users/vitalii/www/nitra/tauri-components/tauri-plugin-agent/`.
- Доменні команди інструментів (`scan_tasks` тощо) лишаються в кожному додатку —
  плагін відповідає лише за журнал, ACP-клієнт і доменний MCP-міст.

> Фаза 1 (npm-пакет) і фаза 2 (Rust-плагін) незалежні: JS можна винести першим,
> а Rust-команди тимчасово лишити скопійованими, поки плагін не готовий.

## 7. Пакування (за правилом `n-npm-module`)

- `name`: `@7n/tauri-components`, публічний (`"publishConfig": { "access": "public" }`).
- `"files"` — **whitelist** (`src`, `types`) з негативними glob на тести:
  `"!**/*.test.*"`, `"!**/__tests__/**"`, `"!**/fixtures/**"`.
- **`peerDependencies`** (host надає, щоб не дублювати інстанси — критично для Vue):
  `vue`, `quasar`, `@tauri-apps/api`, `@tauri-apps/plugin-http`.
  `marked` — runtime-залежність пакета (`dependencies`) для рендеру markdown.
- `devDependencies` — лише в **кореневому** `package.json` репозиторію, не в `npm/`.
- `"types"` + генерація `.d.ts` через `bunx -p typescript tsc` (варіант A,
  бо є `src/**/*.js`); hk pre-commit hook.
- Версія / CHANGELOG — **не редагувати руками**: лише change-файли через
  `npx @nitra/cursor change …`, bump робить `n-cursor release` у CI.
- `.github/workflows/npm-publish.yml` — канонічний снепет із правила (OIDC).

> Vue SFC у npm: компоненти публікуються як `.vue` і компілюються у білді
> додатка (Vite + `@vitejs/plugin-vue` уже є скрізь). Пакет **не** пре-компілює
> SFC — споживач має `@vitejs/plugin-vue`, тож достатньо віддати сирці.
> Перевірити, що Vite додатка не виключає `node_modules/@7n` з Vue-трансформації
> (`optimizeDeps`/`ssr.noExternal` за потреби).

## 8. План міграції `task` (виконано)

1. **Підготувати пакет**: скопіювати core+vue+components у `npm/src/`,
   виконати інверсію каталогу (caталог → параметр у `dispatch`/`manifest`/`scope`),
   зробити `createAgentKit` і `useAgent(config)` (омлх/runAgent-шлях), перенести тести.
2. **`task` споживає пакет**: додати `@7n/tauri-components`, замінити
   `app/src/tool/*` і `composables/use-agent.js` на тонкі обгортки.
   `AgentDialog`/`AuditDialog` — імпорт із пакета, передати `:agent`.
3. **Прогнати тести** `task` (vitest) — regression-гейт винесення.
4. **Опублікувати** v0.1.0, перевести `task` з `file:` на версію.
5. **mlmail / myshare**: додати залежність, написати свій `catalog.js` + Rust-команди,
   підключити компоненти.

**Фаза 2 (виконано):** перехід із власного omlx/runAgent chat-completion loop
на Agent Client Protocol — `createAcpAgentKit`/`useAcpAgent()` (§3.2–3.3) стали
**єдиним** агентним шляхом; `createAgentKit`/`useAgent()`/`llm.js`/`use-omlx.js`/
`omlx-models.js`/`resolve-omlx-base-url.js` та Rust-команда `omlx_config` —
видалені. Деталі — CHANGELOG.md.

## 9. Підтверджені рішення

- **Один пакет із subpath-export** (`.` / `/vue` / `/components`) — ✅ обрано.
- **`marked`** — ✅ лишаємо в пакеті як runtime-залежність (`dependencies`),
  не peer. Рендер markdown у чаті — всередині пакета.
- **Rust** — ✅ окремий **Tauri-плагін** `tauri-plugin-agent` (crate у цьому ж
  репо), а не копія команд. Див. §6.
- **`actorTiers`** — ✅ публічний конфіг із дефолтом `{ human: 2, agent: 1 }`,
  перевизначення дозволене.

```
