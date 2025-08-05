// src/infrastructure/auth/auth-provider-factory.ts
import type {
  AuthenticationProvider,
  InstallationContext,
} from "../../types/repository-setup"
import { createGitHubAppAuthProvider } from "./github-app-auth-provider"
import { createSessionAuthProvider } from "./session-auth-provider"

export const createAuthenticationProvider = (
  context: InstallationContext
): AuthenticationProvider => {
  const sessionProvider = createSessionAuthProvider()
  const appProvider = createGitHubAppAuthProvider(context)

  return {
    getAuthentication: async () => {
      try {
        // Try session auth first
        return await sessionProvider.getAuthentication()
      } catch (sessionError) {
        try {
          // Fallback to GitHub App auth
          return await appProvider.getAuthentication()
        } catch (appError) {
          throw new Error(
            `Authentication failed: Session error: ${sessionError.message}, App error: ${appError.message}`
          )
        }
      }
    },
  }
}
