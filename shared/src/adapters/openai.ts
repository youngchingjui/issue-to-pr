import { err, ok, type Result } from "@shared/entities/result"
import type { LLMErrorCode, LLMMessage, LLMPort } from "@shared/ports/llm"
import OpenAI from "openai"

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
  }): Promise<Result<string, LLMErrorCode>> {
    const chatMessages = [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    try {
      const res = await client.chat.completions.create({
        model,
        messages: chatMessages,
        max_tokens: maxTokens,
      })

      const content = res.choices[0]?.message?.content?.trim() ?? ""
      return ok(content)
    } catch (error: unknown) {
      console.error(error)
      return err(mapOpenAIErrorToCode(error))
    }
  }

  return {
    createCompletion,
  }
}

export default makeOpenAIAdapter

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
