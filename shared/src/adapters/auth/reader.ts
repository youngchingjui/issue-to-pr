import { Session } from "@/entities/Session"
import {
  AccessToken,
  AuthenticatedUser,
  AuthReaderPort,
} from "@/ports/auth/reader"

function toAccessToken(input: unknown): AccessToken | null {
  if (typeof input !== "object" || input === null) return null
  const t = input as Record<string, unknown>
  const accessToken =
    typeof t["access_token"] === "string" ? t["access_token"] : ""
  if (!accessToken) return null
  return {
    access_token: accessToken,
    refresh_token:
      typeof t["refresh_token"] === "string"
        ? (t["refresh_token"] as string)
        : "",
    expires_at:
      typeof t["expires_at"] === "number" ? (t["expires_at"] as number) : 0,
    expires_in:
      typeof t["expires_in"] === "number" ? (t["expires_in"] as number) : 0,
    scope: typeof t["scope"] === "string" ? (t["scope"] as string) : "",
    token_type:
      typeof t["token_type"] === "string" ? (t["token_type"] as string) : "",
    id_token:
      typeof t["id_token"] === "string" ? (t["id_token"] as string) : "",
  }
}

export const createAuthReaderAdapter = (session: Session): AuthReaderPort => {
  return {
    async getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
      if (!session?.profile?.login || !session?.token?.sub) return null
      return {
        id: session.token.sub,
        githubLogin: session.profile.login,
        avatarUrl: session.token?.picture ?? undefined,
        email: session.token?.email ?? null,
      }
    },
    async getAccessToken(): Promise<AccessToken | null> {
      return toAccessToken(session?.token) ?? null
    },
    async getAuth() {
      if (!session?.profile?.login || !session?.token?.sub) {
        return { ok: false as const, error: "AuthRequired" as const }
      }
      const token = toAccessToken(session.token)
      if (!token || !token.access_token) {
        return { ok: false as const, error: "AuthRequired" as const }
      }
      return {
        ok: true as const,
        value: {
          user: {
            id: session.token.sub,
            githubLogin: session.profile.login,
            avatarUrl: session.token?.picture ?? undefined,
            email: session.token?.email ?? null,
          },
          token,
        },
      }
    },
  }
}
