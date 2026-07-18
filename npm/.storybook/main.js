/** @type {import('@storybook/vue3-vite').StorybookConfig} */
export default {
  framework: '@storybook/vue3-vite',
  stories: ['../src/components/**/*.stories.js'],
  addons: ['@storybook/addon-vitest'],
  // `@storybook/vue3-vite`'s own viteFinal (`vue-template.ts`) only aliases the
  // `vue` import — it does NOT register `@vitejs/plugin-vue`, since Storybook's
  // Vite frameworks assume the host project already has a Vite+Vue config to
  // merge into. This package has none (source-only lib, no app-level vite.config),
  // so both `storybook dev/build` and the vitest addon need it added explicitly here.
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    const vuePlugin = await import('@vitejs/plugin-vue')
    return mergeConfig(config, { plugins: [vuePlugin.default()] })
  }
}
