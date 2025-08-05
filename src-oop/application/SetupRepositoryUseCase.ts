// src-oop/application/SetupRepositoryUseCase.ts
import {
  IAuthenticationService,
  IRepositoryService,
  IFileSystemService,
  IRetryService,
  SetupRepositoryRequest,
  RetryOptions,
} from "../types/repository-setup"
import { RepositoryRequestValidator } from "../domain/repository/RepositoryService"

export class SetupRepositoryUseCase {
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly repositoryService: IRepositoryService,
    private readonly fileSystemService: IFileSystemService,
    private readonly retryService: IRetryService
  ) {}

  async execute(request: SetupRepositoryRequest): Promise<string> {
    // Validate input
    if (!RepositoryRequestValidator.validate(request)) {
      throw new Error("Invalid repository request")
    }

    // Get repository path
    const repoPath = await this.fileSystemService.getRepoDirectory(
      request.repoFullName
    )

    try {
      // Get authentication
      const auth = await this.authService.getAuthentication()

      // Setup repository with retry logic
      await this.retryService.withRetry(async () => {
        await this.repositoryService.setupRepository(repoPath, auth, request)
      }, this.getRetryOptions())

      return repoPath
    } catch (error) {
      console.error(`[ERROR] Failed to setup repository: ${error}`)

      // Clean up on failure
      try {
        await this.fileSystemService.cleanupDirectory(repoPath)
      } catch (cleanupError) {
        console.warn(`[WARNING] Failed to cleanup after error: ${cleanupError}`)
      }

      throw error
    }
  }

  private getRetryOptions(): Partial<RetryOptions> {
    return {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      retryableErrors: [Error],
    }
  }
}
