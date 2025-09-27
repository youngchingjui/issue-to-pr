import type { Result } from "@/entities/result"

export interface LLMMessage {
  role: "user" | "assistant"
  content: string
}

export type LLMErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INSUFFICIENT_QUOTA"
  | "UNSUPPORTED_LOCATION"
  | "INVALID_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UNKNOWN"

export interface LLMPort {
  createCompletion(params: {
    system?: string
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
  }): Promise<Result<string, LLMErrorCode>>
}

export interface LLMFactoryPort {
  create(apiKey: string, type: "openai" | "anthropic"): LLMPort
}
