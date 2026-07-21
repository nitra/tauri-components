/**
 * Канонічний preview для Vue-компонентних бібліотек (storybook.mdc, ADR
 * канон-storybook-для-vue-компонентних-бібліотек). Базовано на шаблоні правила
 * (`npx @7n/rules fix storybook` відтворив би canonical iconSet — `svg-material-icons`),
 * але iconSet/iconMapFn тут — СВІДОМИЙ locale-виняток (не помилка): цей пакет (на
 * відміну від пілотного консюмера канону) передає іконки виключно як `sym_o_*`/`sym_r_*`/
 * `sym_s_*` (Material Symbols, три варіанти), а не `sym_*`/Material Icons — заміна на
 * канонічний `svg-material-icons`+`material-icons` iconSet зламала б рендер усіх іконок
 * компонентів (реальні `.vue`, напр. AgentDialog/AuditDialog/StatePill, використовують
 * лише `sym_o_*`).
 */
import { setup } from '@storybook/vue3-vite'
import * as Quasar from 'quasar'
import 'quasar/dist/quasar.css'
import symOutlinedIconSet from 'quasar/icon-set/material-symbols-outlined'
import * as symOutlined from '@quasar/extras/material-symbols-outlined'
import * as symRounded from '@quasar/extras/material-symbols-rounded'
import * as symSharp from '@quasar/extras/material-symbols-sharp'
import { initialize, mswLoader } from 'msw-storybook-addon'

const QUASAR_COMPONENT_RE = /^Q[A-Z]/u
const quasarComponents = Object.fromEntries(Object.entries(Quasar).filter(([name]) => QUASAR_COMPONENT_RE.test(name)))

// Компоненти передають іконки як `sym_o_*` (Material Symbols Outlined). QIcon
// завжди рендерить такі імена як ligature-текст свого вбудованого iconSet
// (quasar/src/components/icon/QIcon.js, симетрична логіка для `sym_o_`/`sym_r_`/
// `sym_s_`) — без завантаженого шрифту вони показуються як слово ("close"), не
// гліф, і `iconSet`-конфіг цю поведінку не перехоплює (вона хардкоджена в QIcon
// саме для `props.name`). `$q.iconMapFn` — єдиний хук, що спрацьовує РАНІШЕ:
// повертає SVG path-дані з `@quasar/extras`, self-hosted, без Google Fonts CDN.
const SYM_VARIANTS = [
  ['sym_o_', symOutlined, 'symOutlined'],
  ['sym_r_', symRounded, 'symRounded'],
  ['sym_s_', symSharp, 'symSharp']
]

/**
 * @param {string} name іконка, як передана в `icon`/`:icon`-пропси (напр. `sym_o_close`)
 * @returns {{icon: string} | undefined} SVG path-дані для QIcon, або undefined (дефолтна поведінка)
 */
function iconMapFn(name) {
  for (const [prefix, mod, exportPrefix] of SYM_VARIANTS) {
    if (!name.startsWith(prefix)) continue
    const pascalCase = name
      .slice(prefix.length)
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    const svgPath = mod[exportPrefix + pascalCase]
    if (svgPath) return { icon: svgPath }
  }
}

// msw-storybook-addon: перехоплює мережеві запити компонентів у Storybook. Same-origin GET
// (Vite HMR, статичні файли dev-сервера) — очікуваний шум, мовчки пропускаємо; усе інше —
// warn (не білд-помилка навмисно, хвиля 1 — м'який сигнал, не гейт).
initialize({
  onUnhandledRequest(request, print) {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.origin === globalThis.location?.origin) return
    print.warning()
  }
})

setup(app => {
  for (const [name, component] of Object.entries(quasarComponents)) {
    app.component(name, component)
  }
  app.directive('close-popup', Quasar.ClosePopup)
  // Повний install Quasar (не окремі компоненти) — бібліотека компонентів очікує
  // глобально зареєстровані Quasar-примітиви так само, як у реальному додатку-споживачі.
  // Dialog — `use-updater.js` викликає `$q.dialog(...)` напряму (реальна залежність,
  // не лише канонічний default).
  app.use(Quasar.Quasar, {
    plugins: { Notify: Quasar.Notify, Dialog: Quasar.Dialog },
    // Вбудовані іконки Quasar (q-select dropdown arrow, q-input clear, тощо) за
    // замовчуванням тягнуться з Material Icons — шрифт, що тут ніде не
    // завантажений (свідомо, без Google Fonts CDN). `iconSet: material-symbols-outlined`
    // перемикає ці внутрішні імена на `sym_o_*`, які вже проходять через `iconMapFn` вище.
    iconSet: symOutlinedIconSet,
    config: { dark: false, iconMapFn }
  })
})

/** @type {import('@storybook/vue3-vite').Preview} */
const preview = {
  // mswLoader (не mswDecorator — deprecated у msw-storybook-addon 2.x, буде видалений
  // у наступному релізі): loaders виконуються per-story ДО рендеру й інтегруються з
  // async story-рендерингом Storybook, на відміну від декоратора.
  loaders: [mswLoader],
  parameters: {
    controls: { matchers: { color: /(background|color)$/iu, date: /Date$/u } }
  }
}

export default preview
