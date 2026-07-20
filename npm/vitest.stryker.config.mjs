import { defineConfig } from 'vitest/config'

// Stryker's @stryker-mutator/vitest-runner fails to initialize the canonical
// vitest.config.mjs once it gained a `projects` array with a browser/Playwright
// project (`storybook`) — `AggregateError: Failed to initialize projects`.
// This isolated config carries only the pre-Storybook `unit` test settings
// verbatim, so mutation testing (JS-only, node environment) stays unaffected
// by the Storybook/browser-mode project. Referenced only from stryker.config.mjs
// (`vitest.configFile`) — @7n/test's coverage/storybook collectors always resolve
// vitest.config.mjs by default and never touch this file.
export default defineConfig({
  test: {
    include: ['**/*.test.{js,mjs}', 'tests/**/*.test.{js,mjs}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/reports/stryker/**'],
    environment: 'node',
    pool: 'forks',
    coverage: { provider: 'v8', reporter: ['lcov', 'text-summary'] }
  }
})
