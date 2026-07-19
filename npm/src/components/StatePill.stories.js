import StatePill from './StatePill.vue'
import { STATUS_COLOR } from './status.js'

export default {
  title: 'Components/StatePill',
  component: StatePill,
  argTypes: {
    status: { control: 'select', options: Object.keys(STATUS_COLOR) }
  }
}

export const Pending = { args: { status: 'pending' } }
export const Running = { args: { status: 'running' } }
export const Done = { args: { status: 'done' } }
export const Partial = { args: { status: 'partial' } }
export const NeedsApproval = { args: { status: 'needs_approval' } }
export const Failed = { args: { status: 'failed' } }
export const Rejected = { args: { status: 'rejected' } }
