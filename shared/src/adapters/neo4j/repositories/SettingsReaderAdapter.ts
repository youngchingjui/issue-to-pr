import { err, ok, type Result } from "@shared/entities/result"

import type { SettingsReaderPort } from "@/shared/src/ports/repositories/settings.reader"

// Minimal session surface used by this adapter
export interface Neo4jSessionLike {
  executeRead<T>(fn: (tx: unknown) => Promise<T>): Promise<T>
  close: () => Promise<void>
}

export interface UserRepoLike {
  getUserSettings(
    tx: unknown,
    username: string
  ): Promise<{ openAIApiKey?: string | null } | null>
}

export interface Neo4jDeps {
  /** Obtain a fresh session; the adapter will close it after use. */
  getSession: () => Neo4jSessionLike
  userRepo: UserRepoLike
}

/**
 * Adapter to read user settings from Neo4j.
 * - Accepts a session factory and user repository.
 * - Manages session lifecycle internally for each call.
 */
export function makeSettingsReaderAdapter({
  getSession,
  userRepo,
}: Neo4jDeps): SettingsReaderPort {
  async function getOpenAIKey(
    userId: string
  ): Promise<Result<string | null, "Unknown">> {
    if (!userId) return ok(null)
    const session = getSession()
    try {
      const settings = await session.executeRead((tx: unknown) =>
        userRepo.getUserSettings(tx as never, userId)
      )
      const key = settings?.openAIApiKey?.trim()
      return ok(key && key.length > 0 ? key : null)
    } catch (e) {
      console.error(e)
      return err("Unknown")
    } finally {
      try {
        await session.close()
      } catch {}
    }
  }

  return { getOpenAIKey }
}
