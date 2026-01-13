import OpenAI from "openai"

import { err, ok, type Result } from "@/shared/entities/result"
import type { LLMErrorCode, LLMFactoryPort, LLMPort } from "@/shared/ports/llm"

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
  }): Promise<Result<string, LLMErrorCode>> {
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

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: openaiMessages,
        max_tokens: maxTokens,
        temperature: 0,
      })

      const content = response.choices[0]?.message?.content || ""
      return ok(content)
    } catch (error: unknown) {
      console.error(error)
      return err(mapOpenAIErrorToCode(error))
    }
  }
}

// Narrow enough for OpenAI's APIError, but doesn't hard-depend on SDK types
type OpenAIErrorLike = {
  status?: number
  code?: string
  name?: string
  message?: string
  error?: {
    type?: string
    code?: string
    message?: string
  }
}

function isOpenAIError(err: unknown): err is OpenAIErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err ||
      "code" in err ||
      "name" in err ||
      "message" in err ||
      "error" in err)
  )
}

function mapOpenAIErrorToCode(error: unknown): LLMErrorCode {
  if (!isOpenAIError(error)) return "UNKNOWN"

  // OpenAI SDK usually sets `status`, and nests details under `error`
  const status = error.status
  const code = (error.code ?? error.error?.code ?? "").toLowerCase()
  const name = (error.name ?? "").toLowerCase()
  const message = (error.message ?? error.error?.message ?? "").toLowerCase()

  if (status === 401) return "UNAUTHORIZED"
  if (status === 429) return "RATE_LIMITED"
  if (status === 402) return "INSUFFICIENT_QUOTA"
  if (status === 403) {
    if (code.includes("unsupported_country_region_territory"))
      return "UNSUPPORTED_LOCATION"
    return "UNAUTHORIZED"
  }
  if (status === 400) return "INVALID_REQUEST"
  if (status === 408) return "TIMEOUT"
  if (status === 503 || status === 502 || status === 504)
    return "SERVICE_UNAVAILABLE"

  if (code.includes("insufficient_quota")) return "INSUFFICIENT_QUOTA"
  if (code.includes("rate_limit")) return "RATE_LIMITED"
  if (code.includes("unsupported_country_region_territory"))
    return "UNSUPPORTED_LOCATION"
  if (code.includes("timeout")) return "TIMEOUT"
  if (code.includes("unauthorized")) return "UNAUTHORIZED"

  // Network-ish errors sometimes surface via generic names
  if (name.includes("fetcherror") || name.includes("typeerror"))
    return "NETWORK_ERROR"

  // Last-ditch inference from message text
  if (message.includes("quota")) return "INSUFFICIENT_QUOTA"
  if (message.includes("rate limit")) return "RATE_LIMITED"
  if (message.includes("timeout")) return "TIMEOUT"
  if (message.includes("unauthorized") || message.includes("permission"))
    return "UNAUTHORIZED"

  return "UNKNOWN"
}

export class OpenAIAdapterFactory implements LLMFactoryPort {
  create(apiKey: string, type: "openai"): LLMPort {
    return new OpenAIAdapter(apiKey)
  }
}
