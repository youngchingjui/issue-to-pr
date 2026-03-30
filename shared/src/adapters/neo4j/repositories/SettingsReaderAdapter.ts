import { err, ok, type Result } from "@/shared/entities/result"
import type { LLMProvider } from "@/shared/lib/types"
import type {
  SettingsReaderErrors,
  SettingsReaderPort,
} from "@/shared/ports/repositories/settings.reader"

// Minimal session surface used by this adapter
export interface Neo4jSessionLike {
  executeRead<T>(fn: (tx: unknown) => Promise<T>): Promise<T>
  close: () => Promise<void>
}

export interface UserRepoLike {
  getUserSettings(
    tx: unknown,
    username: string
  ): Promise<{
    openAIApiKey?: string | null
    anthropicApiKey?: string | null
    llmProvider?: LLMProvider | null
  } | null>
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
 *
 * Prefer `StorageAdapter.settings.user` for new code when a full
 * `Neo4jDataSource` is available. This adapter is still used in
 * contexts that only have a session factory + user repo (e.g. tests).
 */
export function makeSettingsReaderAdapter({
  getSession,
  userRepo,
}: Neo4jDeps): SettingsReaderPort {
  async function readSettings(userId: string) {
    if (!userId) return { found: false as const }
    const session = getSession()
    try {
      const settings = await session.executeRead((tx: unknown) =>
        userRepo.getUserSettings(tx as never, userId)
      )
      if (settings === null) return { found: false as const }
      return { found: true as const, settings }
    } catch (e) {
      console.error(e)
      return { error: e }
    } finally {
      try {
        await session.close()
      } catch {}
    }
  }

  async function getOpenAIKey(
    userId: string
  ): Promise<Result<string | null, SettingsReaderErrors>> {
    const result = await readSettings(userId)
    if ("error" in result) return err("Unknown")
    if (!result.found) return err("UserNotFound")
    const key = result.settings.openAIApiKey?.trim()
    return ok(key && key.length > 0 ? key : null)
  }

  async function getAnthropicKey(
    userId: string
  ): Promise<Result<string | null, SettingsReaderErrors>> {
    const result = await readSettings(userId)
    if ("error" in result) return err("Unknown")
    if (!result.found) return err("UserNotFound")
    const key = result.settings.anthropicApiKey?.trim()
    return ok(key && key.length > 0 ? key : null)
  }

  async function getLLMProvider(
    userId: string
  ): Promise<Result<LLMProvider | null, SettingsReaderErrors>> {
    const result = await readSettings(userId)
    if ("error" in result) return err("Unknown")
    if (!result.found) return err("UserNotFound")
    return ok(result.settings.llmProvider ?? null)
  }

  return { getOpenAIKey, getAnthropicKey, getLLMProvider }
}
