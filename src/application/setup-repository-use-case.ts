// src/application/setup-repository-use-case.ts
import { buildAuthenticatedCloneUrl } from "../domain/auth/authentication-service"
import {
  setupRepositoryWithAuth,
  validateRepositoryRequest,
} from "../domain/repository/repository-service"
import type {
  Dependencies,
  SetupRepositoryRequest,
} from "../types/repository-setup"

export const createSetupRepositoryUseCase =
  (deps: Dependencies) =>
  async (request: SetupRepositoryRequest): Promise<string> => {
    // Validate input
    if (!validateRepositoryRequest(request)) {
      throw new Error("Invalid repository request")
    }

    // Get repository path
    const repoPath = await deps.fs.getRepoDirectory(request.repoFullName)

    try {
      // Get authentication
      const auth = await deps.auth.getAuthentication()

      // Build authenticated clone URL
      const cloneUrl = buildAuthenticatedCloneUrl(
        request.repoFullName,
        auth.token
      )

      // Setup repository with retry logic
      await deps.retry.withRetry(
        async () => {
          await setupRepositoryWithAuth(deps)(repoPath, cloneUrl, request)
        },
        {
          maxAttempts: 3,
          backoffStrategy: "exponential",
          retryableErrors: [Error],
        }
      )

      return repoPath
    } catch (error) {
      console.error(`[ERROR] Failed to setup repository: ${error}`)

      // Clean up on failure
      try {
        await deps.fs.cleanup(repoPath)
      } catch (cleanupError) {
        console.warn(`[WARNING] Failed to cleanup after error: ${cleanupError}`)
      }

      throw error
    }
  }
