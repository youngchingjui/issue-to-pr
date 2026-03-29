import type { LLMProvider } from "@/shared/lib/types"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"

export type ResolveApiKeyResult =
  | { ok: true; apiKey: string; provider: LLMProvider }
  | { ok: false; error: string }

/**
 * Providers that currently support running workflows.
 * TODO: When a new provider runtime ships (e.g. Anthropic Claude via Phase 3,
 * see issue #1527), add it here and remove the corresponding
 * `checkProviderSupported` calls from API routes and webhook handlers.
 */
const SUPPORTED_WORKFLOW_PROVIDERS: ReadonlySet<LLMProvider> = new Set([
  "openai",
])

/**
 * Check whether a resolved provider is supported for running workflows.
 * Returns an error message string if unsupported, null if OK.
 *
 * TODO: Once all providers have runtime implementations, this function
 * and all its call sites can be removed.
 */
export function checkProviderSupported(provider: LLMProvider): string | null {
  if (SUPPORTED_WORKFLOW_PROVIDERS.has(provider)) return null
  const name = provider === "anthropic" ? "Anthropic Claude" : provider
  return `${name} is not yet available for running workflows. Please switch to a supported provider (e.g. OpenAI) in Settings.`
}

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
      const providerName =
        explicitProvider === "openai" ? "OpenAI" : "Anthropic"
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
