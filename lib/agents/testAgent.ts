import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { AgentConstructorParams } from "@/lib/types"

import { Agent } from "./base"

/**
 * TestAgent is a lightweight wrapper around the core Agent that does **not**
 * persist any events to Neo4j.  It is intended solely for local / CI tests
 * where we want to replay a fixed set of messages and inspect the agent's
 * next response (e.g. for post-write linting).
 *
 * Behavioural differences from the production Agent:
 * 1.  You can pass a `messages` array to pre-seed the conversation.  If this
 *     array is provided we deliberately **ignore** any `systemPrompt` that
 *     might be supplied in `AgentConstructorParams` to avoid double prompts.
 * 2.  Calling `addJobId` is a no-op, guaranteeing that no subsequent
 *     `trackMessage` calls will attempt to write to the database.
 */
export class TestAgent extends Agent {
  constructor({
    messages = [],
    systemPrompt,
    ...rest
  }: AgentConstructorParams & {
    /** Pre-seeded messages to replay */
    messages?: ChatCompletionMessageParam[]
  }) {
    // If `messages` are supplied we *omit* `systemPrompt` when calling super to
    // prevent an extra system message from being injected automatically.
    super(messages.length ? { ...rest } : { systemPrompt, ...rest })

    if (messages.length) {
      // We need EnhancedMessage objects internally.  Timestamp isn't critical
      // for logic, but it helps with debugging.
      this.messages = messages.map((m) => ({ ...m, timestamp: new Date() }))
    }
  }

  /** Disable persistence entirely for this agent variant. */
  async addJobId(_jobId: string) {
    // do nothing
    return
  }
}
