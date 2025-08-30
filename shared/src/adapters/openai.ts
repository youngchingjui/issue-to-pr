import OpenAI from "openai"

import type { LLMMessage, LLMPort } from "@/shared/src/core/ports/llm"

/**
 * Minimal OpenAI adapter implementing the shared LLMPort interface.
 */
export class OpenAIAdapter implements LLMPort {
  private client: OpenAI

  constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error("OpenAI API key is missing")
    }
    this.client = new OpenAI({ apiKey })
  }

  async createCompletion({
    system,
    messages,
    model = "gpt-4.1-mini",
    maxTokens = 1024,
  }: {
    system?: string
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string> {
    const result = await this.client.chat.completions.create({
      model,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    })

    return result.choices[0]?.message?.content ?? ""
  }
}

export default OpenAIAdapter

