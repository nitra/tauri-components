/**
 * Classify a tool call for an actor.
 * @param {object[]} catalog tool definitions
 * @param {Record<string, number>|undefined} actorTiers max executable tier rank per actor kind
 * @param {{ kind?: string }} actor caller identity
 * @param {string} toolName tool name
 * @returns {'allow'|'approval'|'deny'} decision
 */
export function classify(
  catalog: object[],
  actorTiers: Record<string, number> | undefined,
  actor: {
    kind?: string
  },
  toolName: string
): 'allow' | 'approval' | 'deny'
/**
 * LLM tool manifest visible to the actor (everything it may run OR request approval for).
 * @param {object[]} catalog tool definitions
 * @param {Record<string, number>|undefined} actorTiers max executable tier rank per actor kind
 * @param {{ kind?: string }} actor caller identity
 * @returns {object[]} OpenAI tools array
 */
export function scopedManifest(
  catalog: object[],
  actorTiers: Record<string, number> | undefined,
  actor: {
    kind?: string
  }
): object[]
/**
 * Tool names visible to the actor.
 * @param {object[]} catalog tool definitions
 * @param {Record<string, number>|undefined} actorTiers max executable tier rank per actor kind
 * @param {{ kind?: string }} actor caller identity
 * @returns {string[]} visible tool names
 */
export function scopedToolNames(
  catalog: object[],
  actorTiers: Record<string, number> | undefined,
  actor: {
    kind?: string
  }
): string[]
export namespace DEFAULT_ACTOR_TIERS {
  let human: number
  let agent: number
}
