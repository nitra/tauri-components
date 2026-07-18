import { setup } from '@storybook/vue3-vite'
import * as Quasar from 'quasar'
import 'quasar/dist/quasar.css'
import * as symOutlined from '@quasar/extras/material-symbols-outlined'
import * as symRounded from '@quasar/extras/material-symbols-rounded'
import * as symSharp from '@quasar/extras/material-symbols-sharp'

const QUASAR_COMPONENT_RE = /^Q[A-Z]/
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

setup(app => {
  for (const [name, component] of Object.entries(quasarComponents)) {
    app.component(name, component)
  }
  app.directive('close-popup', Quasar.ClosePopup)
  app.use(Quasar.Quasar, { plugins: { Notify: Quasar.Notify }, config: { dark: false, iconMapFn } })
})

/** @type {import('@storybook/vue3-vite').Preview} */
export default {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } }
  }
}
