/**
 * @param {object} config kit configuration
 * @param {object[]} config.catalog tool definitions (required)
 * @param {object} config.journal journal store { create, load, update, list }
 * @param {(tool: object, input: object) => unknown} [config.transport] backend runner for domain tools; omit for a chat-only kit (no domain MCP tools)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {object} [config.deps] injectable `acp-agent.js` functions (tests only — defaults to the real module)
 * @returns {{request: (opts: {intent: string, agent: object}) => Promise<object>, respond: (opts: {requestId: string, message: string}) => Promise<object>, approve: (opts: {requestId: string, approve: boolean}) => Promise<object>}} bound kit
 */
export function createAcpAgentKit({ catalog, journal, transport, actorTiers, deps }?: {
    catalog: object[];
    journal: object;
    transport?: (tool: object, input: object) => unknown;
    actorTiers?: Record<string, number>;
    deps?: object;
}): {
    request: (opts: {
        intent: string;
        agent: object;
    }) => Promise<object>;
    respond: (opts: {
        requestId: string;
        message: string;
    }) => Promise<object>;
    approve: (opts: {
        requestId: string;
        approve: boolean;
    }) => Promise<object>;
};
