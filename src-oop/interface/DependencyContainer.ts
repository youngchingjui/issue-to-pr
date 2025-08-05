// src-oop/interface/DependencyContainer.ts
import {
  IAuthenticationService,
  IRepositoryService,
  IFileSystemService,
  IRetryService,
  IGitOperations,
  IGitHubApi,
  IInstallationContext,
  ISessionAuthProvider,
  IGitHubAppAuthProvider,
} from "../types/repository-setup"
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

export class DependencyContainer {
  private readonly _installationContext: IInstallationContext
  private readonly _sessionAuthProvider: ISessionAuthProvider
  private readonly _gitHubAppAuthProvider: IGitHubAppAuthProvider
  private readonly _gitHubApi: IGitHubApi
  private readonly _fileSystemService: IFileSystemService
  private readonly _gitOperations: IGitOperations
  private readonly _authService: IAuthenticationService
  private readonly _repositoryService: IRepositoryService
  private readonly _retryService: IRetryService

  constructor() {
    // Create infrastructure dependencies
    this._installationContext = new InstallationContext()
    this._sessionAuthProvider = new SessionAuthProvider()
    this._gitHubAppAuthProvider = new GitHubAppAuthProvider(
      this._installationContext
    )
    this._gitHubApi = new GitHubApiClient()
    this._fileSystemService = new LocalFileSystemService()
    this._gitOperations = new GitOperations()

    // Create domain services
    this._authService = new AuthenticationService(
      this._sessionAuthProvider,
      this._gitHubAppAuthProvider
    )
    this._repositoryService = new RepositoryService(this._gitOperations)
    this._retryService = new RetryService()
  }

  // Getters for services
  get installationContext(): IInstallationContext {
    return this._installationContext
  }

  get authService(): IAuthenticationService {
    return this._authService
  }

  get repositoryService(): IRepositoryService {
    return this._repositoryService
  }

  get fileSystemService(): IFileSystemService {
    return this._fileSystemService
  }

  get retryService(): IRetryService {
    return this._retryService
  }

  get gitOperations(): IGitOperations {
    return this._gitOperations
  }

  get gitHubApi(): IGitHubApi {
    return this._gitHubApi
  }

  // Create the main use case
  createSetupRepositoryUseCase(): SetupRepositoryUseCase {
    return new SetupRepositoryUseCase(
      this._authService,
      this._repositoryService,
      this._fileSystemService,
      this._retryService
    )
  }
}
