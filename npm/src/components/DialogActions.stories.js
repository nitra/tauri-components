import DialogActions from './DialogActions.vue'

export default {
  title: 'Components/DialogActions',
  component: DialogActions,
  args: { submitLabel: 'Запустити' }
}

export const Default = {}
export const Loading = { args: { loading: true } }
export const Disabled = { args: { disable: true } }
