/**
 * Tests for provider routing logic used by the autoResolveIssue orchestrator.
 *
 * These tests verify resolveApiKey() — the shared function that determines
 * which LLM provider and API key to use. The type system guarantees the data
 * shapes; these tests cover the runtime branching logic that types can't enforce.
 *
 * See docs/user/multi-model-support.md "Defaults and fallbacks" for spec.
 */

import { err, ok } from "@/shared/entities/result"
import type { LLMProvider } from "@/shared/lib/types"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"
import { resolveApiKey } from "@/shared/services/resolveApiKey"

// Helper to build a mock settings object
function mockSettings(overrides: {
  llmProvider?: LLMProvider | null
  openaiKey?: string | null
  anthropicKey?: string | null
  providerError?: "UserNotFound" | "Unknown"
}): SettingsReaderPort {
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

describe("resolveApiKey — provider routing", () => {
  describe("explicit provider preference", () => {
    it("returns openai key when user explicitly selects openai", async () => {
      const settings = mockSettings({
        llmProvider: "openai",
        openaiKey: "sk-test-key",
      })
      const result = await resolveApiKey(settings, "testuser")
      expect(result).toEqual({
        ok: true,
        apiKey: "sk-test-key",
        provider: "openai",
      })
    })

    it("returns anthropic key when user explicitly selects anthropic", async () => {
      const settings = mockSettings({
        llmProvider: "anthropic",
        anthropicKey: "sk-ant-test-key",
      })
      const result = await resolveApiKey(settings, "testuser")
      expect(result).toEqual({
        ok: true,
        apiKey: "sk-ant-test-key",
        provider: "anthropic",
      })
    })

    it("returns error when explicit provider key is missing", async () => {
      const settings = mockSettings({ llmProvider: "openai" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("OpenAI")
        expect(result.error).toContain("Settings")
      }
    })

    it("returns error when explicit anthropic provider key is missing", async () => {
      const settings = mockSettings({ llmProvider: "anthropic" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("Anthropic")
        expect(result.error).toContain("Settings")
      }
    })
  })

  describe("no explicit preference — infer from available keys", () => {
    it("infers openai when only OpenAI key exists", async () => {
      const settings = mockSettings({ openaiKey: "sk-test-key" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result).toEqual({
        ok: true,
        apiKey: "sk-test-key",
        provider: "openai",
      })
    })

    it("infers anthropic when only Anthropic key exists", async () => {
      const settings = mockSettings({ anthropicKey: "sk-ant-test-key" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result).toEqual({
        ok: true,
        apiKey: "sk-ant-test-key",
        provider: "anthropic",
      })
    })

    it("errors when both keys exist — user must choose a default", async () => {
      const settings = mockSettings({
        openaiKey: "sk-test-key",
        anthropicKey: "sk-ant-test-key",
      })
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("multiple providers")
        expect(result.error).toContain("default")
      }
    })

    it("returns clear error when no API keys exist at all", async () => {
      const settings = mockSettings({})
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("No API key configured")
      }
    })
  })

  describe("error handling for getLLMProvider", () => {
    it("returns error when getLLMProvider returns UserNotFound", async () => {
      const settings = mockSettings({ providerError: "UserNotFound" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("No API key configured")
      }
    })

    it("returns error when getLLMProvider returns Unknown error", async () => {
      const settings = mockSettings({ providerError: "Unknown" })
      const result = await resolveApiKey(settings, "testuser")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("Failed to read settings")
      }
    })
  })
})
