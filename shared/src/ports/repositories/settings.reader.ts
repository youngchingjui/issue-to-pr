import type { Result } from "@/shared/entities/result"

export type GetOpenAIKeyErrors = "Unknown"

/**
 * Abstraction for reading a user's OpenAI API key.
 * Provider/storage-agnostic.
 */
export interface SettingsReaderPort {
  /**
   * Fetch the user's OpenAI API key by internal user id.
   * Returns ok(null) if not set.
   * TODO: `userId` currently refers to the GitHub login, but should be the internal user id.
   * We will slowly migrate to the internal user id.
   */
  getOpenAIKey(
    userId: string
  ): Promise<Result<string | null, GetOpenAIKeyErrors>>
}
