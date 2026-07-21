/**
 * @param {object} config gateway config
 * @param {object[]} config.catalog app tool catalog (required — passed to the domain MCP bridge)
 * @param {Record<string, {command: string, args?: string[], env?: Record<string,string>, tiers: Record<string, {label: string, args?: string[], env?: Record<string,string>}>}>} config.agents per-agent-kind spawn presets, keyed by 'codex'|'claude'|'cursor'|'pi'
 * @param {string} [config.defaultTier] fallback modelTier when a request doesn't specify one (default 'AVG')
 * @param {string} config.cwd session working directory (absolute path)
 * @param {Record<string, number>} [config.actorTiers] max executable tier rank per actor kind
 * @param {(tool: object, input: object) => unknown} [config.transport] tool transport (default Tauri invoke)
 * @returns {object} in-app ACP agent gateway
 */
export function useAcpAgent({ catalog, agents, defaultTier, cwd, actorTiers, transport }?: {
    catalog: object[];
    agents: Record<string, {
        command: string;
        args?: string[];
        env?: Record<string, string>;
        tiers: Record<string, {
            label: string;
            args?: string[];
            env?: Record<string, string>;
        }>;
    }>;
    defaultTier?: string;
    cwd: string;
    actorTiers?: Record<string, number>;
    transport?: (tool: object, input: object) => unknown;
}): object;
