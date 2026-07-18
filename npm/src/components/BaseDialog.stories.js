import BaseDialog from './BaseDialog.vue'

export default {
  title: 'Components/BaseDialog',
  component: BaseDialog,
  args: { modelValue: true, title: 'Example dialog', icon: 'sym_o_info' }
}

export const Default = {
  render: args => ({
    components: { BaseDialog },
    setup: () => ({ args }),
    template: `
      <BaseDialog v-bind="args">
        <p>Body content goes here.</p>
        <template #actions>
          <span style="font-size: 12px; opacity: 0.6">actions slot</span>
        </template>
      </BaseDialog>
    `
  })
}
