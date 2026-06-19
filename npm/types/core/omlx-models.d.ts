/**
 * @param {{ baseUrl?: string, apiKey?: string, fetchFn?: typeof fetch, signal?: AbortSignal }} [params] config
 * @returns {Promise<string[]>} loaded model ids (empty on error)
 */
export function listOmlxModels({ baseUrl, apiKey, fetchFn, signal }?: {
    baseUrl?: string;
    apiKey?: string;
    fetchFn?: typeof fetch;
    signal?: AbortSignal;
}): Promise<string[]>;
/**
 * Pick a model: the preferred one if loaded, else the first available, else ''.
 * @param {string[]} models loaded model ids
 * @param {string} [preferred] preferred id
 * @returns {string} chosen model id
 */
export function resolveModel(models: string[], preferred?: string): string;
