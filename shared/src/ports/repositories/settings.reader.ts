import type { Result } from "@/shared/entities/result"

export type GetOpenAIKeyErrors = "UserNotFound" | "Unknown"

/**
 * Abstraction for reading a user's OpenAI API key.
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
  ): Promise<Result<string | null, GetOpenAIKeyErrors>>
}
