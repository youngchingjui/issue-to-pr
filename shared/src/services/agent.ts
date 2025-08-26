import { type Message, toPlainConversation } from "@shared/entities/message"
import type { AgentPort } from "@shared/ports/agent"

export interface RunBasicAgentParams {
  agent: AgentPort
  prompt?: { role: "system" | "developer"; content: string }
  messages: Message[]
  model?: string
  maxTokens?: number
}

/**
 * Run a basic, single-turn agent using only the LLM port.
 * - Accepts domain Messages (tools folded to assistant where needed)
 * - Does not depend on concrete adapters
 */
export async function runBasicAgent(
  params: RunBasicAgentParams
): Promise<string> {
  const { agent, prompt, messages, model, maxTokens } = params
  const { messages: plain } = toPlainConversation(messages)
  const content = await agent.chatCompletion({
    prompt,
    messages: plain,
    model,
    maxTokens,
  })
  return content
}

export default runBasicAgent
