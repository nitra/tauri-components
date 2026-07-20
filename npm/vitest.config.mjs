import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirName = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    // Два незалежні vitest-проєкти в одному canonical config-файлі: `@7n/test`
    // (coverage/mutation-раннер монорепо) резолвить `vitest.config.*` за
    // дефолтом vitest, без `--config`, і фільтрує проєкт саме через
    // `--project=storybook` (runStorybookCoverage) чи запускає всі проєкти разом
    // (runJsCoverage, JS-рядок). Ім'я `'storybook'` — жорсткий контракт, не
    // косметика.
    projects: [
      {
        test: {
          name: 'unit',
          // Підхоплюються обидві основні розкладки: тести поряд із кодом (rule `test`-конвенція —
          // у піддиректоріях `tests/`) і top-level integration suites у `<root>/tests/`.
          include: ['**/*.test.{js,mjs}', 'tests/**/*.test.{js,mjs}'],
          // reports/stryker/.tmp/ містить sandbox-копії тестів від Stryker (incremental
          // або aborted-runs); без exclude vitest run --coverage їх підхоплює і вони
          // фейляться, бо запускаються поза реальним repo root.
          exclude: ['**/node_modules/**', '**/dist/**', '**/reports/stryker/**'],
          environment: 'node',
          // `pool: 'forks'` — defense-in-depth ізоляція процесів між test-файлами.
          // У default `pool: 'threads'` усі workers ділять один процес → паралельний
          // `process.chdir(dir)` у тестовій фікстурі перехоплює cwd сусіда посеред
          // FS- або `git`-операції. Реальний інцидент: `git init`+`git commit` із
          // tmp-фікстури потрапив у реальний робочий репозиторій. Forks гарантують
          // ізоляцію. Канон тестів — `withTmpDir(async dir => ...)` (test.mdc).
          pool: 'forks'
        }
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: join(dirName, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ],
    coverage: { provider: 'v8', reporter: ['lcov', 'text-summary'] }
  }
})
