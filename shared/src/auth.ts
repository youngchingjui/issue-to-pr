// Minimal, process-local token store for quick migration.
// Not concurrency-safe across multiple parallel workflows.
// For isolation, consider the scoped variant below.
// Super temporary! Refactor away as soon as possible.

let ACCESS_TOKEN: string | null = null

/**
 * @deprecated Refactor away from this ASAP. Use clean code architecture to provide access tokens to adapters instead.
 */
export function setAccessToken(token: string) {
  ACCESS_TOKEN = typeof token === "string" ? token.trim() : null
}

/**
 * @deprecated Refactor away from this ASAP. Use clean code architecture to provide access tokens to adapters instead.
 */
export function getAccessToken(): string | null {
  return ACCESS_TOKEN
}

/**
 * @deprecated Refactor away from this ASAP. Use clean code architecture to provide access tokens to adapters instead.
 */
export function getAccessTokenOrThrow(): string {
  if (!ACCESS_TOKEN) throw new Error("No access token set")
  return ACCESS_TOKEN
}

/**
 * @deprecated Refactor away from this ASAP. Use clean code architecture to provide access tokens to adapters instead.
 */
export function clearAccessToken() {
  ACCESS_TOKEN = null
}
