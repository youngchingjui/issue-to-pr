// src/domain/repository/repository-service.ts
import type {
  Dependencies,
  SetupRepositoryRequest,
} from "../../types/repository-setup"

export const validateRepositoryRequest = (
  request: SetupRepositoryRequest
): boolean => {
  const repoPattern = /^[^/]+\/[^/]+$/
  return Boolean(
    request.repoFullName &&
      repoPattern.test(request.repoFullName) &&
      request.workingBranch
  )
}

export const setupRepositoryWithAuth =
  (deps: Dependencies) =>
  async (
    path: string,
    cloneUrl: string,
    request: SetupRepositoryRequest
  ): Promise<void> => {
    // Pure orchestration of repository setup steps
    await deps.git.ensureValidRepo(path, cloneUrl)

    try {
      await deps.git.setRemoteOrigin(path, cloneUrl)
    } catch (error) {
      // Non-fatal error - log and continue
      console.warn(`[WARNING] Failed to set authenticated remote: ${error}`)
    }

    await deps.git.cleanCheckout(request.workingBranch, path)
  }
