// src-oop/domain/repository/RepositoryService.ts
import {
  IRepositoryService,
  IGitOperations,
  SetupRepositoryRequest,
  RepositoryAuth,
} from "../../types/repository-setup"
import { CloneUrlBuilder } from "../auth/AuthenticationService"

export class RepositoryService implements IRepositoryService {
  constructor(private readonly gitOperations: IGitOperations) {}

  async setupRepository(
    path: string,
    auth: RepositoryAuth,
    request: SetupRepositoryRequest
  ): Promise<void> {
    // Build authenticated clone URL
    const cloneUrl = CloneUrlBuilder.buildAuthenticatedUrl(
      request.repoFullName,
      auth.token
    )

    // Setup repository steps
    await this.gitOperations.ensureValidRepo(path, cloneUrl)

    try {
      await this.gitOperations.setRemoteOrigin(path, cloneUrl)
    } catch (error) {
      // Non-fatal error - log and continue
      console.warn(`[WARNING] Failed to set authenticated remote: ${error}`)
    }

    await this.gitOperations.cleanCheckout(request.workingBranch, path)
  }
}

export class RepositoryRequestValidator {
  static validate(request: SetupRepositoryRequest): boolean {
    const repoPattern = /^[^/]+\/[^/]+$/
    return Boolean(
      request.repoFullName &&
        repoPattern.test(request.repoFullName) &&
        request.workingBranch
    )
  }

  static validateRepoFullName(repoFullName: string): boolean {
    return /^[^/]+\/[^/]+$/.test(repoFullName)
  }

  static parseRepoFullName(repoFullName: string): {
    owner: string
    repo: string
  } {
    const [owner, repo] = repoFullName.split("/")
    return { owner, repo }
  }
}
