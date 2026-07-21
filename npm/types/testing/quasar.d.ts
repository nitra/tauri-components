/**
 * Mount a component with Quasar registered, without any layout wrapper.
 * @param {object} component Vue component (e.g. one that renders its own QLayout)
 * @param {object} [options] mount options (forwarded)
 * @returns {object} test wrapper
 */
export function mountQuasar(component: object, options?: object): object;
/**
 * Mount a page-level component wrapped in QLayout > QPageContainer.
 * @param {object} component Vue component
 * @param {object} [options] mount options (forwarded)
 * @returns {object} test wrapper
 */
export function mountWithQuasar(component: object, options?: object): object;
