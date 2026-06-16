/**
 * Run the tool-calling loop until the model answers without a tool call.
 * Accepts either a fresh prompt or an existing messages[] for sessional resume.
 * @param {object} params loop parameters
 * @param {string} [params.prompt] user request (fresh start)
 * @param {object[]} [params.messages] existing conversation to resume (takes priority over prompt)
 * @param {(name: string, input: object) => Promise<object>} params.dispatch tool dispatcher returning an envelope
 * @param {(req: {messages: object[], tools: object[]}) => Promise<object>} params.chat model call returning an assistant message
 * @param {number} [params.maxSteps] safety cap on loop iterations
 * @param {string} [params.system] system prompt (only used when building fresh from prompt)
 * @param {object[]} [params.tools] LLM tool manifest (pass a scoped manifest to restrict)
 * @param {(name: string) => 'allow'|'approval'|'deny'} [params.gate] per-call decision (default: allow)
 * @returns {Promise<{content: string, steps: number, trace: object[], messages: object[], stopped?: string, pendingApproval?: object}>} loop result
 */
export function runAgent({ prompt, messages: initialMessages, dispatch, chat, maxSteps, system, tools, gate }: {
    prompt?: string | undefined;
    messages?: object[] | undefined;
    dispatch: (name: string, input: object) => Promise<object>;
    chat: (req: {
        messages: object[];
        tools: object[];
    }) => Promise<object>;
    maxSteps?: number | undefined;
    system?: string | undefined;
    tools?: object[] | undefined;
    gate?: ((name: string) => "allow" | "approval" | "deny") | undefined;
}): Promise<{
    content: string;
    steps: number;
    trace: object[];
    messages: object[];
    stopped?: string;
    pendingApproval?: object;
}>;
/**
 * Build a `chat` function that calls an OpenAI-compatible endpoint (omlx).
 * @param {object} params config
 * @param {string} params.baseUrl base URL incl. /v1 (e.g. http://127.0.0.1:10240/v1)
 * @param {string} params.model served model id
 * @param {string} [params.apiKey] optional bearer token
 * @param {typeof fetch} [params.fetchFn] fetch implementation (injectable for tests / tauri-http)
 * @returns {(req: {messages: object[], tools: object[]}) => Promise<object>} chat function
 */
export function createOpenAiChat({ baseUrl, model, apiKey, fetchFn }: {
    baseUrl: string;
    model: string;
    apiKey?: string | undefined;
    fetchFn?: typeof fetch | undefined;
}): (req: {
    messages: object[];
    tools: object[];
}) => Promise<object>;
