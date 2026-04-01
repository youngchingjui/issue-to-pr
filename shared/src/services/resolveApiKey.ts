import { PROVIDER_CONFIG } from "@/shared/lib/providers/config"
import type { LLMProvider } from "@/shared/lib/types"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"

export type ResolveApiKeyResult =
  | { ok: true; apiKey: string; provider: LLMProvider }
  | { ok: false; error: string }

/**
 * Resolve the API key for a given user based on their provider preference.
 * See docs/user/multi-model-support.md "Defaults and fallbacks".
 *
 * Priority: explicit provider preference → single available key → error.
 * No implicit provider preference — if multiple keys exist with no default set,
 * the user must choose explicitly.
 */
export async function resolveApiKey(
  settings: SettingsReaderPort,
  userId: string
): Promise<ResolveApiKeyResult> {
  const providerResult = await settings.getLLMProvider(userId)
  if (!providerResult.ok) {
    if (providerResult.error === "UserNotFound") {
      return {
        ok: false,
        error:
          "No API key configured. Please add an API key for at least one provider in Settings.",
      }
    }
    return { ok: false, error: "Failed to read settings. Please try again." }
  }

  const explicitProvider = providerResult.value

  if (explicitProvider) {
    const keyResult =
      explicitProvider === "openai"
        ? await settings.getOpenAIKey(userId)
        : await settings.getAnthropicKey(userId)

    if (!keyResult.ok) {
      return { ok: false, error: "Failed to read settings. Please try again." }
    }

    if (!keyResult.value) {
      const providerName = PROVIDER_CONFIG[explicitProvider].displayName
      return {
        ok: false,
        error: `Your ${providerName} API key is missing. Please add it in Settings.`,
      }
    }

    return { ok: true, apiKey: keyResult.value, provider: explicitProvider }
  }

  // No explicit preference — check what keys are available
  const [openaiResult, anthropicResult] = await Promise.all([
    settings.getOpenAIKey(userId),
    settings.getAnthropicKey(userId),
  ])

  if (!openaiResult.ok || !anthropicResult.ok) {
    return { ok: false, error: "Failed to read settings. Please try again." }
  }

  const hasOpenAI = !!openaiResult.value
  const hasAnthropic = !!anthropicResult.value

  if (hasOpenAI && hasAnthropic) {
    return {
      ok: false,
      error:
        "You have API keys for multiple providers but no default selected. Please choose a default provider in Settings.",
    }
  }

  if (hasOpenAI) {
    return { ok: true, apiKey: openaiResult.value!, provider: "openai" }
  }

  if (hasAnthropic) {
    return { ok: true, apiKey: anthropicResult.value!, provider: "anthropic" }
  }

  return {
    ok: false,
    error:
      "No API key configured. Please add an API key for at least one provider in Settings.",
  }
}
