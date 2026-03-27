/**
 * Tests for provider routing logic in the autoResolveIssue orchestrator.
 *
 * These tests verify the conditional branching that determines which LLM
 * provider to use. The type system guarantees the data shapes; these tests
 * cover the runtime branching logic that types can't enforce.
 *
 * See docs/user/multi-model-support.md "Defaults and fallbacks" for spec.
 */

import { err, ok } from "@/shared/entities/result"
import type { LLMProvider } from "@/shared/lib/types"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"

/**
 * Extracts the provider routing logic from the orchestrator so we can
 * test it in isolation without needing Neo4j, Redis, GitHub, etc.
 *
 * This mirrors the logic in autoResolveIssue.ts:
 *   1. If user has explicit provider preference, use it
 *   2. Otherwise infer from which API keys exist
 *   3. If no keys at all, fail
 *   4. If anthropic, fail gracefully (not yet supported)
 */
async function resolveProvider(
  settings: Pick<
    SettingsReaderPort,
    "getLLMProvider" | "getOpenAIKey" | "getAnthropicKey"
  >,
  login: string
): Promise<LLMProvider> {
  const providerResult = await settings.getLLMProvider(login)
  const explicitProvider =
    providerResult.ok && providerResult.value ? providerResult.value : null

  let provider: LLMProvider
  if (explicitProvider) {
    provider = explicitProvider
  } else {
    const [openaiKey, anthropicKey] = await Promise.all([
      settings.getOpenAIKey(login),
      settings.getAnthropicKey(login),
    ])
    const hasOpenAI = openaiKey.ok && !!openaiKey.value
    const hasAnthropic = anthropicKey.ok && !!anthropicKey.value

    if (hasOpenAI) {
      provider = "openai"
    } else if (hasAnthropic) {
      provider = "anthropic"
    } else {
      throw new Error(
        "No API key configured. Please add an API key for at least one provider in Settings."
      )
    }
  }

  if (provider === "anthropic") {
    throw new Error(
      "Anthropic Claude support is coming soon. Please switch your provider to OpenAI in Settings to run workflows."
    )
  }

  return provider
}

// Helper to build a mock settings object
function mockSettings(overrides: {
  llmProvider?: LLMProvider | null
  openaiKey?: string | null
  anthropicKey?: string | null
  providerError?: "UserNotFound" | "Unknown"
}): Pick<
  SettingsReaderPort,
  "getLLMProvider" | "getOpenAIKey" | "getAnthropicKey"
> {
  return {
    getLLMProvider: jest
      .fn()
      .mockResolvedValue(
        overrides.providerError
          ? err(overrides.providerError)
          : ok(overrides.llmProvider ?? null)
      ),
    getOpenAIKey: jest.fn().mockResolvedValue(ok(overrides.openaiKey ?? null)),
    getAnthropicKey: jest
      .fn()
      .mockResolvedValue(ok(overrides.anthropicKey ?? null)),
  }
}

describe("autoResolveIssue provider routing", () => {
  describe("explicit provider preference", () => {
    it("uses openai when user explicitly selects openai", async () => {
      const settings = mockSettings({ llmProvider: "openai" })
      const provider = await resolveProvider(settings, "testuser")
      expect(provider).toBe("openai")
      // Should not check keys when explicit preference is set
      expect(settings.getOpenAIKey).not.toHaveBeenCalled()
      expect(settings.getAnthropicKey).not.toHaveBeenCalled()
    })

    it("throws gracefully when anthropic is explicitly selected", async () => {
      const settings = mockSettings({ llmProvider: "anthropic" })
      await expect(resolveProvider(settings, "testuser")).rejects.toThrow(
        "Anthropic Claude support is coming soon"
      )
    })

    it("includes actionable guidance in the anthropic error", async () => {
      const settings = mockSettings({ llmProvider: "anthropic" })
      await expect(resolveProvider(settings, "testuser")).rejects.toThrow(
        "switch your provider to OpenAI in Settings"
      )
    })
  })

  describe("no explicit preference — infer from available keys", () => {
    it("infers openai when only OpenAI key exists", async () => {
      const settings = mockSettings({ openaiKey: "sk-test-key" })
      const provider = await resolveProvider(settings, "testuser")
      expect(provider).toBe("openai")
    })

    it("infers anthropic when only Anthropic key exists (then fails gracefully)", async () => {
      const settings = mockSettings({ anthropicKey: "sk-ant-test-key" })
      await expect(resolveProvider(settings, "testuser")).rejects.toThrow(
        "Anthropic Claude support is coming soon"
      )
    })

    it("prefers openai when both keys exist", async () => {
      const settings = mockSettings({
        openaiKey: "sk-test-key",
        anthropicKey: "sk-ant-test-key",
      })
      const provider = await resolveProvider(settings, "testuser")
      expect(provider).toBe("openai")
    })

    it("throws clear error when no API keys exist at all", async () => {
      const settings = mockSettings({})
      await expect(resolveProvider(settings, "testuser")).rejects.toThrow(
        "No API key configured"
      )
    })

    it("throws clear error with actionable guidance when no keys", async () => {
      const settings = mockSettings({})
      await expect(resolveProvider(settings, "testuser")).rejects.toThrow(
        "add an API key for at least one provider in Settings"
      )
    })
  })

  describe("error handling for getLLMProvider", () => {
    it("falls back to key inference when getLLMProvider returns UserNotFound", async () => {
      const settings = mockSettings({
        providerError: "UserNotFound",
        openaiKey: "sk-test-key",
      })
      const provider = await resolveProvider(settings, "testuser")
      expect(provider).toBe("openai")
    })

    it("falls back to key inference when getLLMProvider returns Unknown error", async () => {
      const settings = mockSettings({
        providerError: "Unknown",
        openaiKey: "sk-test-key",
      })
      const provider = await resolveProvider(settings, "testuser")
      expect(provider).toBe("openai")
    })
  })
})
