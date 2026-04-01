import { AnthropicAdapter } from "@/shared/adapters/llm/anthropic"
import { OpenAIAdapter } from "@/shared/adapters/llm/OpenAIAdapter"
import type { LLMProvider } from "@/shared/lib/types"
import type { LLMPort } from "@/shared/ports/llm"

export interface ProviderConfig {
  displayName: string
  models: { branchNameGeneration: string }
  createAdapter: (apiKey: string) => LLMPort
  containerEnv: (apiKey: string) => Record<string, string>
}

export const PROVIDER_CONFIG: Record<LLMProvider, ProviderConfig> = {
  openai: {
    displayName: "OpenAI",
    models: { branchNameGeneration: "gpt-4.1" },
    createAdapter: (apiKey: string) => new OpenAIAdapter(apiKey),
    containerEnv: () => ({}),
  },
  anthropic: {
    displayName: "Anthropic",
    models: { branchNameGeneration: "claude-haiku-4-5-20251001" },
    createAdapter: (apiKey: string) => new AnthropicAdapter(apiKey),
    containerEnv: (apiKey: string) => ({ ANTHROPIC_API_KEY: apiKey }),
  },
}

export function createLLMAdapter(
  provider: LLMProvider,
  apiKey: string
): LLMPort {
  return PROVIDER_CONFIG[provider].createAdapter(apiKey)
}

export function getContainerEnvForProvider(
  provider: LLMProvider,
  apiKey: string
): Record<string, string> {
  return PROVIDER_CONFIG[provider].containerEnv(apiKey)
}

export function getBranchNameModel(provider: LLMProvider): string {
  return PROVIDER_CONFIG[provider].models.branchNameGeneration
}
