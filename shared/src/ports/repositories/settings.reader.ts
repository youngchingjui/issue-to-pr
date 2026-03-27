import type { Result } from "@/shared/entities/result"
import type { LLMProvider } from "@/shared/lib/types"

export type SettingsReaderErrors = "UserNotFound" | "Unknown"

/**
 * @deprecated Use `SettingsReaderErrors` instead.
 */
export type GetOpenAIKeyErrors = SettingsReaderErrors

/**
 * Abstraction for reading user settings related to LLM providers.
 * Provider/storage-agnostic.
 */
export interface SettingsReaderPort {
  /**
   * Fetch the user's OpenAI API key by internal user id.
   * - Returns ok(null) if user exists but has no API key configured.
   * - Returns err("UserNotFound") if user doesn't exist in database.
   * - Returns err("Unknown") on database/network errors.
   *
   * TODO: `userId` currently refers to the GitHub login, but should be the internal user id.
   * We will slowly migrate to the internal user id.
   */
  getOpenAIKey(
    userId: string
  ): Promise<Result<string | null, SettingsReaderErrors>>

  /**
   * Fetch the user's Anthropic API key by internal user id.
   * Same semantics as getOpenAIKey.
   */
  getAnthropicKey(
    userId: string
  ): Promise<Result<string | null, SettingsReaderErrors>>

  /**
   * Fetch the user's preferred LLM provider.
   * Returns ok(null) if the user has no preference set (defaults to "openai").
   */
  getLLMProvider(
    userId: string
  ): Promise<Result<LLMProvider | null, SettingsReaderErrors>>
}
