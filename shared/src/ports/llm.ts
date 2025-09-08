export interface LLMMessage {
  role: "user" | "assistant"
  content: string
}

export interface LLMPort {
  createCompletion(params: {
    system?: string
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string>
}

export interface LLMFactoryPort {
  create(apiKey: string, type: "openai" | "anthropic"): LLMPort
}
