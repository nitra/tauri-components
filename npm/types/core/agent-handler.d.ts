/**
 * Start a new agent request.
 * @param {{ intent: string, actor: object, chat: Function, dispatch: Function, journal: object, tools: object[], gate: Function, buildSystem?: Function, grounding?: object }} opts request parameters
 * @returns {Promise<object>} structured result envelope
 */
export function handleRequest({ intent, actor, chat, dispatch, journal, tools, gate, buildSystem, grounding }: {
    intent: string;
    actor: object;
    chat: Function;
    dispatch: Function;
    journal: object;
    tools: object[];
    gate: Function;
    buildSystem?: Function;
    grounding?: object;
}): Promise<object>;
/**
 * Resume a conversation with a follow-up / clarification answer.
 * @param {{ requestId: string, message: string, actor: object, chat: Function, dispatch: Function, journal: object, tools: object[], gate: Function }} opts resume parameters
 * @returns {Promise<object>} updated result envelope
 */
export function handleRespond({ requestId, message, chat, dispatch, journal, tools, gate }: {
    requestId: string;
    message: string;
    actor: object;
    chat: Function;
    dispatch: Function;
    journal: object;
    tools: object[];
    gate: Function;
}): Promise<object>;
/**
 * Approve (or reject) a pending destructive action. Executes with the approver's
 * (human) authority via the injected dispatch — no gate.
 * @param {{ requestId: string, approve: boolean, dispatch: Function, journal: object }} opts approval parameters
 * @returns {Promise<object>} updated result envelope
 */
export function handleApprove({ requestId, approve, dispatch, journal }: {
    requestId: string;
    approve: boolean;
    dispatch: Function;
    journal: object;
}): Promise<object>;
