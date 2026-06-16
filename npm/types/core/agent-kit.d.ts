/**
 * @param {object} config kit configuration
 * @param {object[]} config.catalog tool definitions (required)
 * @param {string|((ctx: object) => string)} [config.systemPrompt] domain system prompt (or builder from grounding ctx)
 * @param {(tool: object, input: object) => unknown} [config.transport] backend runner; omit to build the kit without dispatch (manifest/scope only)
 * @param {object} [config.journal] journal store { create, load, update, list }
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {{ tool: string, key?: string, fallback?: unknown }} [config.grounding] optional read tool to ground the prompt
 * @returns {{ dispatch: Function|null, classify: Function, scopedManifest: Function, toolManifest: Function, request: Function, respond: Function, approve: Function }} bound kit
 */
export function createAgentKit({ catalog, systemPrompt, transport, journal, actorTiers, grounding }?: {
    catalog: object[];
    systemPrompt?: string | ((ctx: object) => string) | undefined;
    transport?: ((tool: object, input: object) => unknown) | undefined;
    journal?: object | undefined;
    actorTiers?: Record<string, number> | undefined;
    grounding?: {
        tool: string;
        key?: string;
        fallback?: unknown;
    } | undefined;
}): {
    dispatch: Function | null;
    classify: Function;
    scopedManifest: Function;
    toolManifest: Function;
    request: Function;
    respond: Function;
    approve: Function;
};
