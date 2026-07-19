import RequestView from './RequestView.vue'

export default {
  title: 'Components/RequestView',
  component: RequestView
}

export const Pending = {
  args: {
    result: { status: 'pending' }
  }
}

export const Done = {
  args: {
    result: {
      status: 'done',
      summary: 'Task created successfully.',
      actions: [{ tool: 'fs.write', input: { path: '~/projects/mt/task.md' }, envelope: { ok: true } }]
    }
  }
}

export const ActionFailure = {
  args: {
    result: {
      status: 'partial',
      summary: 'Task created, but one write failed.',
      actions: [
        { tool: 'fs.write', input: { path: '~/projects/mt/task.md' }, envelope: { ok: true } },
        { tool: 'fs.write', input: { path: '~/projects/mt/notes.md' }, envelope: { ok: false } }
      ]
    }
  }
}

export const NeedsClarification = {
  args: {
    result: { status: 'needs_clarification', question: 'Which project should this task belong to?' }
  }
}

export const Failed = {
  args: {
    result: { status: 'failed', error: 'omlx server unreachable at http://localhost:11434' }
  }
}
