import { lazy } from "@/utils/lazy"

export interface SessionWithTokenLike {
  token?: { access_token?: string | null } | null
}

export type AccessTokenProvider = () => Promise<string>

// Build a lazy session provider by injecting the boundary-specific session factory
export const makeSessionProvider = <TSession>(
  createSession: () => Promise<TSession | null>
) => lazy(createSession)

// Build a lazy access token provider from a session provider
export const makeAccessTokenProvider = (
  sessionProvider: () => Promise<SessionWithTokenLike | null>
): AccessTokenProvider =>
  lazy(async () => {
    const session = await sessionProvider()
    const raw = session?.token?.access_token
    const token = typeof raw === "string" ? raw.trim() : ""
    if (token === "") {
      throw new Error("No access token")
    }
    return token
  })

// More flexible variant where caller specifies how to extract token
export const makeAccessTokenProviderFrom = <TSession>(
  sessionProvider: () => Promise<TSession | null>,
  getToken: (session: TSession | null) => string | null | undefined
): AccessTokenProvider =>
  lazy(async () => {
    const session = await sessionProvider()
    const raw = getToken(session)
    const token = typeof raw === "string" ? raw.trim() : ""
    if (token === "") {
      throw new Error("No access token")
    }
    return token
  })
