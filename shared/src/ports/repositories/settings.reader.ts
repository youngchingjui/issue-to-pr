import type { Result } from "@shared/entities/result"

export type GetOpenAIKeyErrors = "Unknown"

/**
 * Abstraction for reading a user's OpenAI API key.
 * Provider/storage-agnostic.
 */
export interface SettingsReaderPort {
  /**
   * Fetch the user's OpenAI API key by internal user id.
   * Returns ok(null) if not set.
   */
  getOpenAIKey(
    userId: string
  ): Promise<Result<string | null, GetOpenAIKeyErrors>>
}
