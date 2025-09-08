import type { LLMFactoryPort, LLMPort } from "@shared/ports/llm"
import OpenAI from "openai"

/**
 * OpenAI adapter implementing the LLMPort interface.
 * This adapter provides a clean interface to OpenAI's chat completions API.
 */
export class OpenAIAdapter implements LLMPort {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  async createCompletion({
    system,
    messages,
    model = "gpt-4o-mini",
    maxTokens = 2000,
  }: {
    system?: string
    messages: Array<{ role: "user" | "assistant"; content: string }>
    model?: string
    maxTokens?: number
  }): Promise<string> {
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      []

    // Add system message if provided
    if (system) {
      openaiMessages.push({ role: "system", content: system })
    }

    // Add user/assistant messages
    for (const message of messages) {
      openaiMessages.push({
        role: message.role,
        content: message.content,
      })
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      temperature: 0,
    })

    return response.choices[0]?.message?.content || ""
  }
}

export class OpenAIAdapterFactory implements LLMFactoryPort {
  create(apiKey: string, type: "openai"): LLMPort {
    return new OpenAIAdapter(apiKey)
  }
}
