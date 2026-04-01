/**
 * Provider support — both OpenAI and Anthropic are available
 *
 * Requirements (docs/user/multi-model-support.md):
 * - Users can select either OpenAI or Anthropic as their provider
 * - Provider is resolved from user settings (explicit preference or inferred from available keys)
 * - There is no provider gate — both providers are fully supported
 */

import { ok } from "@/shared/entities/result"
import type { LLMProvider } from "@/shared/lib/types"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"
import { resolveApiKey } from "@/shared/services/resolveApiKey"

function mockSettings(overrides: {
  llmProvider?: LLMProvider | null
  openaiKey?: string | null
  anthropicKey?: string | null
}): SettingsReaderPort {
  return {
    getLLMProvider: jest
      .fn()
      .mockResolvedValue(ok(overrides.llmProvider ?? null)),
    getOpenAIKey: jest.fn().mockResolvedValue(ok(overrides.openaiKey ?? null)),
    getAnthropicKey: jest
      .fn()
      .mockResolvedValue(ok(overrides.anthropicKey ?? null)),
  }
}

describe("provider support", () => {
  it("resolves Anthropic as a fully supported provider", async () => {
    const settings = mockSettings({
      llmProvider: "anthropic",
      anthropicKey: "sk-ant-key",
    })

    const result = await resolveApiKey(settings, "testuser")

    expect(result).toEqual({
      ok: true,
      apiKey: "sk-ant-key",
      provider: "anthropic",
    })
  })

  it("resolves OpenAI as a fully supported provider", async () => {
    const settings = mockSettings({
      llmProvider: "openai",
      openaiKey: "sk-openai-key",
    })

    const result = await resolveApiKey(settings, "testuser")

    expect(result).toEqual({
      ok: true,
      apiKey: "sk-openai-key",
      provider: "openai",
    })
  })

  it("does not have a provider support gate", () => {
    // checkProviderSupported was removed — both providers are supported
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/shared/services/resolveApiKey")
    expect(mod.checkProviderSupported).toBeUndefined()
  })
})
