import type { AgentMessage, AgentPort } from "@shared/ports/agent"
import OpenAI from "openai"
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions"

export class OpenAIAdapter implements AgentPort {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }
  async chatCompletion({
    prompt,
    messages,
    model = "gpt-5",
    maxTokens = 128000,
  }: {
    prompt?: { role: "system" | "developer"; content: string }
    messages: AgentMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string> {
    const oaiMessages: Array<ChatCompletionMessageParam> = []

    if (!prompt) {
      throw new Error("System/developer prompt is required")
    }
    oaiMessages.push({
      role: prompt.role,
      content: prompt.content,
    })

    for (const m of messages) {
      switch (m.role) {
        case "user":
          oaiMessages.push({ role: "user", content: m.content })
          break
        case "assistant":
          oaiMessages.push({
            role: "assistant",
            content: m.content,
            tool_calls: m.toolCalls,
          })
          break
        case "tool":
          oaiMessages.push({
            role: "tool",
            content: m.content,
            tool_call_id: m.toolCallId,
          })
          break
      }
    }

    const response = await this.client.chat.completions.create({
      model,
      messages: oaiMessages,
      max_completion_tokens: maxTokens,
    })

    return response.choices[0]?.message?.content ?? ""
  }
}

export default OpenAIAdapter
