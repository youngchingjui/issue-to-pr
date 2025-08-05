// src-oop/domain/auth/AuthenticationService.ts
import {
  IAuthenticationService,
  ISessionAuthProvider,
  IGitHubAppAuthProvider,
  RepositoryAuth,
} from "../../types/repository-setup"

export class AuthenticationService implements IAuthenticationService {
  constructor(
    private readonly sessionProvider: ISessionAuthProvider,
    private readonly appProvider: IGitHubAppAuthProvider
  ) {}

  async getAuthentication(): Promise<RepositoryAuth> {
    try {
      // Try session authentication first
      return await this.sessionProvider.getAuthentication()
    } catch (sessionError) {
      try {
        // Fallback to GitHub App authentication
        return await this.appProvider.getAuthentication()
      } catch (appError) {
        throw new Error(
          `Authentication failed: Session error: ${sessionError.message}, App error: ${appError.message}`
        )
      }
    }
  }
}

export class CloneUrlBuilder {
  static buildAuthenticatedUrl(repoFullName: string, token: string): string {
    if (token.startsWith("ghs_")) {
      // GitHub App installation token
      return `https://x-access-token:${token}@github.com/${repoFullName}.git`
    }
    // OAuth or personal access token
    return `https://${token}@github.com/${repoFullName}.git`
  }
}

export class AuthenticationValidator {
  static validate(auth: RepositoryAuth): boolean {
    return auth.isValid()
  }

  static selectStrategy(
    sessionAvailable: boolean,
    appAvailable: boolean
  ): "session" | "app" | null {
    if (sessionAvailable) return "session"
    if (appAvailable) return "app"
    return null
  }
}
