import OpenAI from "openai"

import type { LLMMessage, LLMPort } from "@/shared/src/core/ports/llm"

export function makeOpenAIAdapter(params: { apiKey: string }): LLMPort {
  const { apiKey } = params

  const client = new OpenAI({ apiKey })

  async function createCompletion({
    system,
    messages,
    model = "gpt-5",
    maxTokens = 150000,
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

    const res = await client.chat.completions.create({
      model,
      messages: chatMessages,
      max_tokens: maxTokens,
    })

    return res.choices[0]?.message?.content?.trim() ?? ""
  }

  return {
    createCompletion,
  }
}

export default makeOpenAIAdapter
