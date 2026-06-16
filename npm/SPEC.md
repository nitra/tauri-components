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

| Доменне (лишається в додатку)                | Універсальне (їде в пакет)                         |
| -------------------------------------------- | ------------------------------------------------- |
| `tool/catalog.js` — перелік інструментів     | `tool/llm.js` — `runAgent`, `createOpenAiChat`    |
| `createSystemPrompt` (текст про mt-графи)    | `tool/agent-handler.js` — request/respond/approve |
| Rust-команди інструментів (`scan_tasks`, …)  | `tool/dispatch.js`, `scope.js`, `manifest.js`     |
| `task-create.js::validateTaskName`           | `tool/transports.js` (Tauri invoke)               |
|                                              | `tool/journal-store-tauri.js`                     |
|                                              | `composables/use-omlx.js`, `use-agent.js`         |
|                                              | всі 5 компонентів                                 |

**Проблема:** зараз `manifest.js`, `scope.js`, `dispatch.js` статично імпортують
`catalog.js` як модуль-сінглтон. Пакет не може зашити в себе task-каталог.

**Рішення:** інвертувати залежність — каталог стає **аргументом**, а не імпортом.
Чисті функції без стану (`validateInput`, `toJsonSchema`, `runAgent`,
`createOpenAiChat`, `finalize`) лишаються stateless і експортуються напряму;
каталог-залежні (`getTool`, `toolManifest`, `scopedManifest`, `classify`,
`createDispatch`) зв'язуються всередині фабрики `createAgentKit(config)`.

## 3. Публічний API

Пакет має кілька entrypoint'ів (subpath exports), щоб додаток, що використовує
лише ядро (наприклад headless-оркестратор), не тягнув Vue/Quasar.

```jsonc
// npm/package.json → "exports"
{
  ".":        "./src/index.js",        // ядро (без Vue): tool surface + agent loop
  "./vue":     "./src/vue/index.js",    // композабли (vue + tauri)
  "./components": "./src/components/index.js" // .vue компоненти (vue + quasar)
}
```

### 3.1 `@7n/tauri-components` (ядро, без Vue)

```js
// stateless, без каталогу
export function runAgent({ prompt, messages, dispatch, chat, maxSteps, system, tools, gate }) // → { content, steps, trace, messages, stopped?, pendingApproval? }
export function createOpenAiChat({ baseUrl, model, apiKey, fetchFn }) // → chat(req)
export function validateInput(tool, input) // → string|null
export function toJsonSchema(input)        // → JSON Schema

// фабрика, зв'язана з каталогом додатка
export function createAgentKit(config) // див. 3.2
```

### 3.2 `createAgentKit(config)` — серце інтеграції

```js
const kit = createAgentKit({
  catalog,          // обов'язково: масив TOOLS додатка (форма як task/catalog.js)
  systemPrompt,     // string | (ctx) => string — доменний промпт
  transport,        // (tool, input) => Promise<unknown> — напр. tauriTransport
  journal,          // store { create, load, update, list }
  actorTiers,       // optional: { human: 2, agent: 1 } (дефолт як зараз)
  grounding,        // optional: { tool: 'workspaces', inject(ctx) } — підстановка
                    //           списку для conversational grounding (зараз — workspaces)
})

// kit повертає:
kit.dispatch          // (name, input) => envelope        — зв'язаний з transport
kit.toolManifest      // (allow?) => OpenAI tools
kit.classify          // (actor, name) => 'allow'|'approval'|'deny'
kit.scopedManifest    // (actor) => tools
kit.request           // ({ intent, actor, chat }) => result
kit.respond           // ({ requestId, message, actor, chat }) => result
kit.approve           // ({ requestId, approve }) => result
```

`request/respond/approve` — це поточні `handleRequest/handleRespond/handleApprove`,
але `journal`, `dispatch`, `tools`, `gate` беруться з kit, а не передаються щоразу.

### 3.3 `@7n/tauri-components/vue`

```js
export function useAgent(config)  // фабрика-композабл: будує kit + omlx chat (tauri-http) +
                                  // journal (Tauri) + actor; повертає
                                  // { baseUrl, model, apiKey, saveOmlx, loadOmlxEnv,
                                  //   journal, request, respond, approve }
export function useOmlx(options)  // { storagePrefix, defaultBaseUrl, defaultModel }
```

`useAgent(config)` отримує `{ catalog, systemPrompt, grounding }` додатка і
всередині сам збирає `tauriTransport`, `createTauriJournalStore`, `useOmlx`.
Тобто додаток пише тонку обгортку:

```js
// app/src/composables/use-agent.js (у кожному додатку — 5 рядків)
import { useAgent as useAgentBase } from '@7n/tauri-components/vue'
import { catalog } from '../tool/catalog.js'
import { systemPrompt } from '../tool/prompt.js'
export const useAgent = () => useAgentBase({ catalog, systemPrompt })
```

### 3.4 `@7n/tauri-components/components`

Експортує: `AgentDialog`, `AuditDialog`, `RequestView`, `BaseDialog`,
`DialogActions`.

**Контракт декаплінгу:** `AgentDialog` зараз викликає `useAgent()` всередині.
Робимо його чистим — приймає вже зібраний агент через проп:

```vue
<AgentDialog v-model="open" :agent="agent" @ran="reload" />
```

де `const agent = useAgent()` (обгортка з 3.3). Так компонент не знає про
каталог, тестується ізольовано, і додаток контролює конфіг. `AuditDialog`
аналогічно приймає `:agent`. `RequestView`/`BaseDialog`/`DialogActions` уже
чисті (props-only) — переносяться як є.

## 4. Розкладка модулів пакета

```
npm/
├── package.json
├── SPEC.md                      ← цей файл
├── src/
│   ├── index.js                 # re-export core
│   ├── core/
│   │   ├── llm.js               # runAgent, createOpenAiChat  (із task, без зміни)
│   │   ├── agent-handler.js     # handleRequest/Respond/Approve (журнал/dispatch інжектяться)
│   │   ├── dispatch.js          # createDispatch, validateInput (catalog → param)
│   │   ├── manifest.js          # toolManifest(catalog, allow), toJsonSchema
│   │   ├── scope.js             # classify(catalog, actorTiers, actor, name), scopedManifest
│   │   └── agent-kit.js         # createAgentKit — зв'язує все вище
│   ├── vue/
│   │   ├── index.js
│   │   ├── use-agent.js         # фабрика-композабл
│   │   ├── use-omlx.js          # параметризований storagePrefix/defaults
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
| `systemPrompt`         | текст про mt task graphs      | свій доменний текст                |
| Rust-команди           | `scan_tasks`, `create_task`…  | свої `#[tauri::command]`           |
| `grounding` (опц.)     | `workspaces` → mt-шляхи       | за потреби або вимкнено            |

Форма каталогу не змінюється — це той самий масив об'єктів
`{ tier, name, summary, input, tauri, validate? }`, що в `task/catalog.js`.

## 6. Rust-частина (фаза 2)

`journal_*` (create/load/update/list) і `omlx_config` зараз живуть у
`task/app/src-tauri/src/lib.rs` і так само дублюватимуться у трьох бекендах.
Спільний JS викликає `invoke('journal_create')` — якщо команди немає, впаде.

**Рекомендація:** оформити **Tauri-плагін** `tauri-plugin-agent` (окремий
crate у цьому ж репозиторії, новий workspace-member поряд із `npm/`), що реєструє
команди `journal_*` + `omlx_config` і тримає FS-реалізацію журналу. Кожен
додаток робить `.plugin(tauri_plugin_agent::init())` у білдері — і команди
з'являються без копіпасти.

- npm не може містити Rust → це **окремий артефакт**: crates.io або git-залежність
  у `Cargo.toml` кожного додатка.
- Розкладка: `/Users/vitalii/www/nitra/tauri-components/crate/` (або `tauri-plugin/`).
- Доменні команди інструментів (`scan_tasks` тощо) лишаються в кожному додатку —
  плагін відповідає лише за журнал та omlx-конфіг.

> Фаза 1 (npm-пакет) і фаза 2 (Rust-плагін) незалежні: JS можна винести першим,
> а Rust-команди тимчасово лишити скопійованими, поки плагін не готовий.

## 7. Пакування (за правилом `n-npm-module`)

- `name`: `@7n/tauri-components`, публічний (`"publishConfig": { "access": "public" }`).
- `"files"` — **whitelist** (`src`, `types`) з негативними glob на тести:
  `"!**/*.test.*"`, `"!**/__tests__/**"`, `"!**/fixtures/**"`.
- **`peerDependencies`** (host надає, щоб не дублювати інстанси — критично для Vue):
  `vue`, `quasar`, `@tauri-apps/api`, `@tauri-apps/plugin-http`.
  `marked` — runtime-залежність пакета (рендер markdown у чаті), якщо лишаємо.
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

## 8. План міграції `task`

1. **Підготувати пакет** (фаза 1): скопіювати core+vue+components у `npm/src/`,
   виконати інверсію каталогу (caталог → параметр у `dispatch`/`manifest`/`scope`),
   зробити `createAgentKit` і `useAgent(config)`, перенести тести.
2. **`task` споживає пакет**: додати `@7n/tauri-components` (через `bun link` або
   `file:` поки API нестабільне), замінити `app/src/tool/*` і `composables/use-agent.js`
   на тонкі обгортки (лишити `catalog.js`, `prompt.js`, `task-create.js`).
   `AgentDialog`/`AuditDialog` — імпорт із пакета, передати `:agent`.
3. **Прогнати тести** `task` (vitest) — поведінка має лишитись ідентичною; це
   regression-гейт винесення.
4. **Опублікувати** v0.1.0, перевести `task` з `file:` на версію.
5. **mlmail / myshare**: додати залежність, написати свій `catalog.js` +
   `systemPrompt` + Rust-команди (фаза 2: плагін), підключити компоненти.

## 9. Рішення, які треба підтвердити

- **Один пакет із subpath-export** (`.` / `/vue` / `/components`) проти трьох
  окремих пакетів. Рекомендація: один — простіше для трьох невеликих додатків.
- **`marked`** лишаємо в пакеті як runtime-залежність чи рендеримо markdown поза
  пакетом (зараз у task `marked` у залежностях; перевірити, чи компоненти ним
  користуються — RequestView/AgentDialog наразі ні).
- **Rust: окремий crate vs повна копія команд** у кожному додатку на старті.
  Рекомендація: фаза 1 без Rust-плагіна (скопіювати команди), плагін — окремою
  ітерацією.
- **Назва actor / `actorTiers`** як публічний конфіг — лишаємо дефолт
  `{ human: 2, agent: 1 }`, але дозволяємо перевизначення.
```
