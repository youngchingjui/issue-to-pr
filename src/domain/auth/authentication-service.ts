// src/domain/auth/authentication-service.ts
import type { RepositoryAuth } from "../../types/repository-setup"

export const buildAuthenticatedCloneUrl = (
  repoFullName: string,
  token: string
): string => {
  // Pure function - no side effects
  if (token.startsWith("ghs_")) {
    // GitHub App installation token
    return `https://x-access-token:${token}@github.com/${repoFullName}.git`
  }
  // OAuth or personal access token
  return `https://${token}@github.com/${repoFullName}.git`
}

export const validateAuthentication = (auth: RepositoryAuth): boolean => {
  return Boolean(auth.token && auth.type)
}

export const selectAuthenticationStrategy = (
  sessionAvailable: boolean,
  appAvailable: boolean
): "session" | "app" | null => {
  if (sessionAvailable) return "session"
  if (appAvailable) return "app"
  return null
}
