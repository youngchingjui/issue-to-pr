// Port definitions for API key access and policy
// These ports allow app-level adapters (e.g., Neo4j repositories) to plug into
// shared, framework-agnostic business logic.

export type UserIdentity = {
  username: string
}

export interface UserApiKeyReader {
  getUserOpenAIKey(username: string): Promise<string | null>
}

export interface SharedApiKeyReader {
  getSharedOpenAIKey(): Promise<string | null>
}

export interface SharedApiKeyWriter {
  setSharedOpenAIKey(key: string): Promise<void>
}

export interface SharedKeyAccessPolicy {
  canUseSharedKey(user: UserIdentity): Promise<boolean>
}

export interface OpenAIKeyDeps {
  userReader: UserApiKeyReader
  sharedReader: SharedApiKeyReader
  policy: SharedKeyAccessPolicy
}

/**
 * Returns the most appropriate OpenAI API key for the given user based on policy:
 * 1) If the user has their own key, return it.
 * 2) Else, if policy allows, return the shared key (if present).
 * 3) Else, return null.
 */
export async function getOpenAIKeyForUser(
  user: UserIdentity,
  deps: OpenAIKeyDeps
): Promise<string | null> {
  // Prefer user-provided key
  const userKey = await deps.userReader.getUserOpenAIKey(user.username)
  if (userKey && userKey.trim().length > 0) return userKey.trim()

  // Check policy/gate for access to shared key
  const allowed = await deps.policy.canUseSharedKey(user)
  if (!allowed) return null

  const shared = await deps.sharedReader.getSharedOpenAIKey()
  const key = shared?.trim()
  return key && key.length > 0 ? key : null
}

