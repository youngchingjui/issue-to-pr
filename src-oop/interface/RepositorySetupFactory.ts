// src-oop/interface/RepositorySetupFactory.ts
import { SetupRepositoryUseCase } from "../application/SetupRepositoryUseCase"
import { AuthenticationService } from "../domain/auth/AuthenticationService"
import { RepositoryService } from "../domain/repository/RepositoryService"
import { RetryService } from "../domain/resilience/RetryService"
import { SessionAuthProvider } from "../infrastructure/auth/SessionAuthProvider"
import { GitHubAppAuthProvider } from "../infrastructure/auth/GitHubAppAuthProvider"
import { GitHubApiClient } from "../infrastructure/github/GitHubApiClient"
import { LocalFileSystemService } from "../infrastructure/filesystem/LocalFileSystemService"
import { GitOperations } from "../infrastructure/git/GitOperations"
import { InstallationContext } from "../infrastructure/context/InstallationContext"

export class RepositorySetupFactory {
  private static instance: SetupRepositoryUseCase | null = null

  static create(): SetupRepositoryUseCase {
    if (this.instance) {
      return this.instance
    }

    // Create infrastructure dependencies
    const installationContext = new InstallationContext()
    const sessionAuthProvider = new SessionAuthProvider()
    const gitHubAppAuthProvider = new GitHubAppAuthProvider(installationContext)
    const gitHubApiClient = new GitHubApiClient()
    const fileSystemService = new LocalFileSystemService()
    const gitOperations = new GitOperations()

    // Create domain services
    const authService = new AuthenticationService(
      sessionAuthProvider,
      gitHubAppAuthProvider
    )
    const repositoryService = new RepositoryService(gitOperations)
    const retryService = new RetryService()

    // Create application use case
    this.instance = new SetupRepositoryUseCase(
      authService,
      repositoryService,
      fileSystemService,
      retryService
    )

    return this.instance
  }

  static createForTesting(dependencies: {
    authService?: any
    repositoryService?: any
    fileSystemService?: any
    retryService?: any
  }): SetupRepositoryUseCase {
    // Factory method for testing with dependency injection
    const {
      authService = new AuthenticationService(
        new SessionAuthProvider(),
        new GitHubAppAuthProvider(new InstallationContext())
      ),
      repositoryService = new RepositoryService(new GitOperations()),
      fileSystemService = new LocalFileSystemService(),
      retryService = new RetryService(),
    } = dependencies

    return new SetupRepositoryUseCase(
      authService,
      repositoryService,
      fileSystemService,
      retryService
    )
  }

  static reset(): void {
    // Reset singleton instance (useful for testing)
    this.instance = null
  }
}
