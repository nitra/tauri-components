// Single source of truth for request-status accent colors, shared by the
// components that render a status pill (StatePill, and any custom UI).

export const STATUS_COLOR = {
  pending: '#8e8e93',
  running: '#0a84ff',
  done: '#30d158',
  partial: '#ff9f0a',
  needs_clarification: '#64d2ff',
  needs_approval: '#ff9f0a',
  failed: '#ff453a',
  rejected: '#8e8e93',
}

const FALLBACK = '#8e8e93'

/**
 * @param {string} status request status
 * @returns {string} accent color (fallback grey for unknown statuses)
 */
export function statusColor(status) {
  return STATUS_COLOR[status] ?? FALLBACK
}
