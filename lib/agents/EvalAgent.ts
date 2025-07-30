import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

/**
 * EvalAgent is a lightweight wrapper around the core Agent that is intended for
 * one-off evaluation jobs (e.g. plan grading). It deliberately avoids
 * persisting any events to Neo4j and allows callers to optionally pre-seed the
 * conversation with messages
 */
export class EvalAgent extends Agent {
  constructor({
    messages = [],
    systemPrompt,
    ...rest
  }: AgentConstructorParams & {
    /** Optional pre-seeded messages to replay */
    messages?: ChatCompletionMessageParam[]
  }) {
    // If messages are supplied we omit the system prompt when calling super to
    // prevent an extra system message from being injected automatically.
    super(messages.length ? { ...rest } : { systemPrompt, ...rest })

    if (messages.length) {
      // Convert messages to EnhancedMessage objects expected internally. A
      // timestamp aids debugging but is not critical for core logic.
      this.messages = messages.map((m) => ({ ...m, timestamp: new Date() }))
    }
  }
}

export default EvalAgent
