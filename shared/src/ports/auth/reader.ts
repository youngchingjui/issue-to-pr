import { Result } from "../../entities/result"

// shared/src/entities/User.ts
export type AuthenticatedUser = {
  id: string
  githubLogin: string
  avatarUrl?: string
  email?: string | null
}

export type AccessToken = {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  scope: string
  token_type: string
  id_token: string
}

export type AuthErrors = "AuthRequired" | "Unknown"

// shared/src/ports/auth.ts
export interface AuthReaderPort {
  getAuthenticatedUser(): Promise<AuthenticatedUser | null>
  getAccessToken(): Promise<AccessToken | null> // user token or installation token as policy dictates
  /**
   * Get both the authenticated user and session token.
   * This is useful for use cases that need both the user and session token.
   */
  getAuth(): Promise<
    Result<{ user: AuthenticatedUser; token: AccessToken }, AuthErrors>
  >
}
