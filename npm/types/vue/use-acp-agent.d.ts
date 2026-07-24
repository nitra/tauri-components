/**
 * @param {object} config gateway config
 * @param {object[]} config.catalog app tool catalog (required — passed to the domain MCP bridge)
 * @param {string} [config.defaultTier] fallback modelTier when a request doesn't specify one (default 'avg')
 * @param {string} config.cwd session working directory (absolute path)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {(tool: object, input: object) => unknown} [config.transport] tool transport (default Tauri invoke)
 * @returns {object} in-app ACP agent gateway
 */
export function useAcpAgent({ catalog, defaultTier, cwd, actorTiers, transport }?: {
    catalog: object[];
    defaultTier?: string | undefined;
    cwd: string;
    actorTiers?: Record<string, number> | undefined;
    transport?: ((tool: object, input: object) => unknown) | undefined;
}): object;
