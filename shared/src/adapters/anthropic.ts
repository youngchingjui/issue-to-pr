import Anthropic from "@anthropic-ai/sdk"

import type { LLMMessage, LLMPort } from "@/shared/src/ports/llm"

export class AnthropicAdapter implements LLMPort {
  private client: Anthropic

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error("Anthropic API key is missing")
    }
    this.client = new Anthropic({ apiKey })
  }

  async createCompletion({
    system,
    messages,
    model = "claude-3-5-sonnet-latest",
    maxTokens = 1024,
  }: {
    system?: string
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string> {
    const response = await this.client.messages.create({
      model,
      system,
      max_tokens: maxTokens,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    return response.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("")
  }
}

export default AnthropicAdapter
