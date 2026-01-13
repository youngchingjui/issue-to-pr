import Anthropic from "@anthropic-ai/sdk"

import { err, ok, type Result } from "@/shared/entities/result"
import type { LLMErrorCode, LLMMessage, LLMPort } from "@/shared/ports/llm"

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
  }): Promise<Result<string, LLMErrorCode>> {
    try {
      const response = await this.client.messages.create({
        model,
        system,
        max_tokens: maxTokens,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      const content = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("")

      return ok(content)
    } catch (error: unknown) {
      console.error(error)
      return err(mapAnthropicErrorToCode(error))
    }
  }
}

type AnthropicError = {
  status?: number
  error?: {
    type?: string
    message?: string
  }
}

function isAnthropicError(err: unknown): err is AnthropicError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "error" in err)
  )
}

function mapAnthropicErrorToCode(error: unknown): LLMErrorCode {
  if (!isAnthropicError(error)) return "UNKNOWN"

  const status = error.status
  const type = (error.error?.type || "").toLowerCase()
  const message = (error.error?.message || "").toLowerCase()

  if (status === 401) return "UNAUTHORIZED"
  if (status === 429) return "RATE_LIMITED"
  if (status === 402) return "INSUFFICIENT_QUOTA"
  if (status === 400) return "INVALID_REQUEST"
  if (status === 408) return "TIMEOUT"
  if (status === 503 || status === 502 || status === 504)
    return "SERVICE_UNAVAILABLE"

  if (type.includes("rate_limit")) return "RATE_LIMITED"
  if (type.includes("permission") || type.includes("auth"))
    return "UNAUTHORIZED"
  if (message.includes("quota")) return "INSUFFICIENT_QUOTA"

  return "UNKNOWN"
}

export default AnthropicAdapter
