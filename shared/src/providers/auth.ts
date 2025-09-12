import { lazy } from "../utils/lazy"

export interface SessionWithTokenLike {
  token?: { access_token?: string | null } | null
}

// Build a lazy session provider by injecting the boundary-specific session factory
export const makeSessionProvider = <TSession>(
  createSession: () => Promise<TSession | null>
) => lazy(createSession)

// Build a lazy access token provider from a session provider
export const makeAccessTokenProvider = (
  sessionProvider: () => Promise<SessionWithTokenLike | null>
) =>
  lazy(async () => {
    const session = await sessionProvider()
    const token = session?.token?.access_token ?? null
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("No access token")
    }
    return token
  })

// More flexible variant where caller specifies how to extract token
export const makeAccessTokenProviderFrom = <TSession>(
  sessionProvider: () => Promise<TSession | null>,
  getToken: (session: TSession | null) => string | null | undefined
) =>
  lazy(async () => {
    const session = await sessionProvider()
    const token = getToken(session)
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("No access token")
    }
    return token
  })
