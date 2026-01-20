# Auth System

We need an auth library that can be used in the Next.js app to get auth info. It should be able to return authenticated user info and access tokens, handle token refresh, and be concurrency-safe.

## Goals

- Easy to use: call a single function to get auth info anywhere we need it (within the appropriate server/client boundary).
- Always-valid access tokens: if a token is expired or about to expire, refresh it automatically.
- Concurrency-safe: multiple parallel calls should not trigger multiple refreshes.
- Minimal networking: de‑duplicate repeated auth/session fetches and re-use recent results whenever safe.
- Clear failure modes: callers get a consistent error or redirect path when auth is invalid.

## Simple API Shape (what we want)

- Server (recommended):
  - `auth(): Promise<Session>` – returns a session object with:
    - isAuthenticated: boolean
    - token: { access_token?: string; expires_at?: number }
    - profile: { login?: string }
    - provider: "github-app" | "github-oauth" (for completeness)
- Client: useSession() or fetch to server actions/APIs that call auth() on the server.

Notes:

- Only the server should handle refresh_token and token refresh logic. The client never sees refresh tokens.
- An AccessTokenProvider helper can give callers just the access token when that’s all they need.

## Desired Behaviors

1) Always-valid token on success

- If the existing token is still valid (with a small leeway window), return it immediately.
- If expired or within leeway, perform a refresh automatically before returning to the caller.

1) Single-flight refresh per user

- At most one token refresh runs per user at a time.
- All parallel calls share the same in-flight refresh and receive the updated token once it completes.

1) Short-lived caching and deduplication

- Reuse the most recent session result for a short TTL within the process/request scope to avoid duplicate network calls.
- When running across many instances, optionally use Redis for:
  - a short-lived token cache (so instances can pick up newly refreshed tokens quickly), and
  - a best-effort refresh lock to prevent duplicate refreshes across instances.

1) Minimal surface area for callers

- Callers should not worry about expiry checks, refresh flows, or locks.
- They can assume auth() returns a session whose token is either valid or will throw a consistent auth error.

1) Clear failure/edge cases

- If refresh fails (e.g., bad refresh token), clear cached token and surface a “reauth required” signal.
- On the server, return a NextAuth-compatible redirect or throw a known error type so routes can handle it.
- Never fall back to a stale/invalid token.

## Concurrency Model (single-flight)

In-memory (per process) single-flight with optional Redis coordination for multi-instance deployments:

- In-memory (per user): maintain a refreshInFlight: Promise<Token> | null.
- If token needs refresh and refreshInFlight is null, start refresh and set refreshInFlight.
- If another call arrives while refreshInFlight is set, await it instead of starting a new refresh.
- On success, write the new token to Redis with an expiry; clear refreshInFlight and return the token.
- On failure, clear refreshInFlight, invalidate any cached token, and surface a consistent error.

Optional cross-instance enhancement:

- Acquire a short Redis lock before performing the refresh; if the lock exists, wait briefly and check the Redis token cache again (assume another instance is refreshing).

## Pseudocode sketch

```ts
let refreshInFlight: Promise<Token> | null = null

async function getAccessToken(session: Session): Promise<Token> {
  const needsRefresh = isExpiredOrNearExpiry(session.token)
  if (!needsRefresh) return session.token

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // Optional: best-effort Redis lock per user
      const lock = await tryAcquireLock(userKey, 10 /* seconds */)
      try {
        // Another instance might have refreshed already
        const cached = await readTokenFromRedis(userKey)
        if (cached && !isExpiredOrNearExpiry(cached)) return cached

        const next = await refreshTokenOnServer(session.token.refresh_token)
        await writeTokenToRedis(userKey, next, next.expires_in)
        return next
      } finally {
        await releaseLock(lock)
      }
    })()
  }

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}
```

## Caller experience

- Server route or server action:
  - const session = await auth()
  - if (!session?.token?.access_token) -> treat as unauthenticated (redirect/signin)
  - use session.token.access_token safely (auto-refreshed if needed)

- Client component:
  - Use next-auth’s useSession for UI state, or call a server action that uses auth() on the server for token-requiring operations.

## Configuration knobs (keep minimal)

- sessionMaxAgeSeconds – how long the NextAuth session is valid.
- tokenCacheTtlSeconds – how long we cache a freshly refreshed token in Redis if the provider doesn’t return explicit expires_in.
- refreshLeewaySeconds – small buffer before expiry to proactively refresh.

## Non-goals

- No complex state machines in userland. The system should be easy to read and reason about.
- No client-side refresh logic (security and complexity concerns).

## Implementation notes (current files)

- auth.ts – NextAuth configuration, session/jwt callbacks, and where refresh is triggered.
- lib/auth/config.ts – central auth-related configuration.
- lib/utils/auth.ts – refresh logic (candidate place to simplify around single-flight + optional Redis lock).

## Acceptance checklist

- [ ] auth() returns a session with an always-valid token or a clear unauthenticated error.
- [ ] Parallel calls to auth() cause at most one refresh for a user; others share the result.
- [ ] Minimal extra network requests during high-concurrency paths.
- [ ] No refresh tokens exposed to the client.
- [ ] Predictable handling of failures (reauth required vs retryable errors).
