/**
 * @param {string} status request status
 * @returns {string} accent color (fallback grey for unknown statuses)
 */
export function statusColor(status: string): string;
export namespace STATUS_COLOR {
    let pending: string;
    let running: string;
    let done: string;
    let partial: string;
    let needs_clarification: string;
    let needs_approval: string;
    let failed: string;
    let rejected: string;
}
