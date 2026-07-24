/**
 * Spawn an ACP agent subprocess and run its `initialize` + `session/new`
 * handshake. The spawn command, model tiers, and env all live in the Rust
 * presets (`llm-lib`) — the webview only names a kind and a tier.
 * Returns a session handle to pass to `runAcpTurn`/`cancelAcpSession`.
 * @param {object} params spawn parameters
 * @param {string} params.agentKind 'cursor'|'codex'|'pi' — resolved against the Rust presets
 * @param {string} [params.tier] model tier 'min'|'avg'|'max' (backend defaults to 'avg')
 * @param {string} params.cwd session working directory (absolute path)
 * @param {string} [params.mcpBridgeUrl] this app's domain MCP bridge URL (from acpStartMcpBridge), omit for no domain tools
 * @param {boolean} [params.allowFs] grant fs/read_text_file + fs/write_text_file
 * @param {boolean} [params.allowTerminal] grant terminal/*
 * @returns {Promise<{sessionKey: string, agentKind: string}>} session handle
 */
export function createAcpSession({ agentKind, tier, cwd, mcpBridgeUrl, allowFs, allowTerminal }: {
    agentKind: string;
    tier?: string | undefined;
    cwd: string;
    mcpBridgeUrl?: string | undefined;
    allowFs?: boolean | undefined;
    allowTerminal?: boolean | undefined;
}): Promise<{
    sessionKey: string;
    agentKind: string;
}>;
/**
 * List the ACP agent kinds, model tiers, and UI labels from the Rust presets
 * (`llm-lib`) — the single source the tier picker renders from.
 * @returns {Promise<Record<string, {command: string, label: string, tiers: Record<string, {label: string, env: Record<string,string>, args: string[], postSessionConfig: {configId: string, value: string}|null}>}>>} presets keyed by kind ('cursor'|'codex'|'pi')
 */
export function listAcpTiers(): Promise<Record<string, {
    command: string;
    label: string;
    tiers: Record<string, {
        label: string;
        env: Record<string, string>;
        args: string[];
        postSessionConfig: {
            configId: string;
            value: string;
        } | null;
    }>;
}>>;
/**
 * Run one prompt turn on an already-spawned ACP session, streaming
 * `session/update` chunks into the same shape `runAgent()` returned.
 * @param {object} params turn parameters
 * @param {string} params.sessionKey handle from `createAcpSession`
 * @param {string} params.text prompt text for this turn
 * @param {(snapshot: {text: string, actions: {tool: string, input: object, envelope: object|null}[]}) => void} [params.onChunk] optional live callback with the turn's accumulated text/tool-calls so far, fired on every session/update (UI streaming)
 * @returns {Promise<{content: string, steps: number, trace: object[], messages: object[], stopped?: string}>} runAgent()-shaped result
 */
export function runAcpTurn({ sessionKey, text, onChunk }: {
    sessionKey: string;
    text: string;
    onChunk?: ((snapshot: {
        text: string;
        actions: {
            tool: string;
            input: object;
            envelope: object | null;
        }[];
    }) => void) | undefined;
}): Promise<{
    content: string;
    steps: number;
    trace: object[];
    messages: object[];
    stopped?: string;
}>;
/**
 * Ask the agent to cancel its in-flight prompt turn.
 * @param {string} sessionKey handle from `createAcpSession`
 * @returns {Promise<void>} resolves once the cancel notification is sent
 */
export function cancelAcpSession(sessionKey: string): Promise<void>;
/**
 * Subscribe to `acp://mcp-tool-call` (a domain-catalog tool call the agent
 * made through the MCP bridge, waiting on `acp_mcp_tool_result`).
 * @param {(payload: {requestId: string, tool: string, input: object}) => void} handler callback
 * @returns {Promise<() => void>} unlisten function
 */
export function onAcpToolCall(handler: (payload: {
    requestId: string;
    tool: string;
    input: object;
}) => void): Promise<() => void>;
/**
 * Resolve a pending `acp://mcp-tool-call` with the same envelope shape
 * `createDispatch` returns.
 * @param {string} requestId id from the `acp://mcp-tool-call` payload
 * @param {{ok: boolean, output?: unknown, error?: {code: string, message: string}}} envelope dispatch result
 * @returns {Promise<void>} resolves once the reply reaches the Rust bridge
 */
export function respondAcpToolCall(requestId: string, envelope: {
    ok: boolean;
    output?: unknown;
    error?: {
        code: string;
        message: string;
    };
}): Promise<void>;
/**
 * Subscribe to `acp://permission-request` (a native ACP `session/request_permission`
 * call, e.g. the agent's own file-edit/bash tools asking before running).
 * @param {(payload: {sessionKey: string, requestId: string, toolCall: object, options: {optionId: string, name: string}[]}) => void} handler callback
 * @returns {Promise<() => void>} unlisten function
 */
export function onAcpPermissionRequest(handler: (payload: {
    sessionKey: string;
    requestId: string;
    toolCall: object;
    options: {
        optionId: string;
        name: string;
    }[];
}) => void): Promise<() => void>;
/**
 * Resolve a pending `acp://permission-request` by selecting one of its options.
 * @param {string} requestId id from the `acp://permission-request` payload
 * @param {string} optionId one of the payload's `options[].optionId`
 * @returns {Promise<void>} resolves once the permission response is sent
 */
export function respondAcpPermission(requestId: string, optionId: string): Promise<void>;
/**
 * Register this app's tool catalog with the domain MCP bridge and start it.
 * @param {object[]} catalog tool definitions (same shape passed to `createAcpAgentKit`)
 * @returns {Promise<string>} the bridge's loopback URL, e.g. `http://127.0.0.1:54321/`
 */
export function startAcpMcpBridge(catalog: object[]): Promise<string>;
/**
 * Read the per-machine default agent kind (`ACP_DEFAULT_AGENT` env var).
 * @returns {Promise<{defaultAgentKind: string|null}>} config
 */
export function acpConfig(): Promise<{
    defaultAgentKind: string | null;
}>;
