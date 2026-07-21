/**
 * Spawn an ACP agent subprocess and run its `initialize` + `session/new`
 * handshake. Returns a session handle to pass to `runAcpTurn`/`cancelAcpSession`.
 * @param {object} params spawn parameters
 * @param {string} params.agentKind 'codex'|'claude'|'cursor'|'pi' (informational — passed through, not interpreted here)
 * @param {string} params.command executable to spawn (e.g. 'npx')
 * @param {string[]} [params.args] command arguments
 * @param {Record<string,string>} [params.env] extra environment variables for the subprocess
 * @param {string} params.cwd session working directory (absolute path)
 * @param {string} [params.mcpBridgeUrl] this app's domain MCP bridge URL (from acpStartMcpBridge), omit for no domain tools
 * @param {boolean} [params.allowFs] grant fs/read_text_file + fs/write_text_file
 * @param {boolean} [params.allowTerminal] grant terminal/*
 * @returns {Promise<{sessionKey: string, agentKind: string}>} session handle
 */
export function createAcpSession({ agentKind, command, args, env, cwd, mcpBridgeUrl, allowFs, allowTerminal }: {
    agentKind: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd: string;
    mcpBridgeUrl?: string;
    allowFs?: boolean;
    allowTerminal?: boolean;
}): Promise<{
    sessionKey: string;
    agentKind: string;
}>;
/**
 * Run one prompt turn on an already-spawned ACP session, streaming
 * `session/update` chunks into the same shape `runAgent()` returned.
 * @param {object} params turn parameters
 * @param {string} params.sessionKey handle from `createAcpSession`
 * @param {string} params.text prompt text for this turn
 * @param {(update: object) => void} [params.onChunk] optional live callback for each raw session/update (UI streaming)
 * @returns {Promise<{content: string, steps: number, trace: object[], messages: object[], stopped?: string}>} runAgent()-shaped result
 */
export function runAcpTurn({ sessionKey, text, onChunk }: {
    sessionKey: string;
    text: string;
    onChunk?: (update: object) => void;
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
