import { getConfig } from '@nitra/eslint-config'

export default [
  {
    ignores: [
      '**/*.md',
      'npm/types/**',
      'tauri-plugin-agent/target/**',
      '.pi/**',
      'docs/**',
    ],
  },
  ...getConfig({
    vue: ['npm'],
  }),
  {
    // The Vue/Tauri layer imports peer deps (vue, quasar, @tauri-apps/*) whose
    // re-export chains import-x/named can't statically follow — it misreports
    // ref/computed/invoke as "not found". Core stays covered (no peer imports).
    files: ['npm/src/vue/**', 'npm/src/components/**'],
    rules: {
      'import-x/named': 'off',
    },
  },
]
