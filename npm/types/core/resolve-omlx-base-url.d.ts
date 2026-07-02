/**
 * Is this URL the default local omlx server — the only target eligible for
 * the proxy override? A user who deliberately pointed an app at another
 * host/port must never be silently rerouted (the proxy's upstream is
 * hardwired to the local :8000).
 * @param {string} url candidate base URL
 * @returns {boolean} true for 127.0.0.1:8000 / localhost:8000, false otherwise (incl. parse errors)
 */
export function isDirectOmlxUrl(url: string): boolean;
/**
 * One-shot probe: GET {proxy origin}/health with a short timeout. 2xx means
 * the proxy (and omlx behind it) is alive → use the proxy; anything else
 * (timeout, refused, 502) → use the direct URL.
 * @param {{ directUrl?: string, proxyUrl?: string, fetchFn?: typeof fetch, timeoutMs?: number }} [params] config
 * @returns {Promise<string>} the base URL to use
 */
export function resolveOmlxBaseUrl({ directUrl, proxyUrl, fetchFn, timeoutMs, }?: {
    directUrl?: string;
    proxyUrl?: string;
    fetchFn?: typeof fetch;
    timeoutMs?: number;
}): Promise<string>;
/**
 * Cached {@link resolveOmlxBaseUrl}: at most one probe per proxyUrl per TTL
 * window, so callers may resolve before every LLM call without paying the
 * probe latency each time, while still noticing the proxy starting/stopping
 * within one TTL.
 * @param {{ directUrl?: string, proxyUrl?: string, fetchFn?: typeof fetch, timeoutMs?: number, ttlMs?: number, now?: () => number }} [params] config
 * @returns {Promise<string>} the base URL to use
 */
export function resolveOmlxBaseUrlCached({ ttlMs, now, ...probeOptions }?: {
    directUrl?: string;
    proxyUrl?: string;
    fetchFn?: typeof fetch;
    timeoutMs?: number;
    ttlMs?: number;
    now?: () => number;
}): Promise<string>;
/** Test hook: drop all cached probe results. */
export function __resetOmlxBaseUrlCache(): void;
export const DIRECT_OMLX_BASE_URL: "http://127.0.0.1:8000/v1";
export const PROXY_OMLX_BASE_URL: "http://127.0.0.1:8088/v1";
