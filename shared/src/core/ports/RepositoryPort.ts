import type { Repository } from "../entities/Repository.js"

export interface RepositoryPort {
  /**
   * Setup a local copy of a repository
   */
  setupLocalRepository(params: {
    repoFullName: string
    workingBranch: string
  }): Promise<Repository>

  /**
   * Get repository metadata from GitHub
   */
  getRepositoryMetadata(repoFullName: string): Promise<{
    fullName: string
    defaultBranch: string
    cloneUrl: string
  }>

  /**
   * Clean up a local repository
   */
  cleanupRepository(repository: Repository): Promise<void>
}
