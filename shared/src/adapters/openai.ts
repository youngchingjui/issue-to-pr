import OpenAI from "openai"

import type { LLMMessage, LLMPort } from "@/shared/src/core/ports/llm"

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
    model = "gpt-5",
    maxTokens = 1024,
  }: {
    system?: string
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string> {
    const chatMessages = [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const res = await this.client.chat.completions.create({
      model,
      messages: chatMessages,
      max_tokens: maxTokens,
    })

    return res.choices[0]?.message?.content?.trim() ?? ""
  }
}

export default OpenAIAdapter

