import type { Repository } from "../0 core/entities/Repository.js"
import type { RepositoryPort } from "../0 core/ports/RepositoryPort.js"

export class RepositoryAdapter implements RepositoryPort {
  constructor(
    private readonly getOctokit: () => Promise<any>,
    private readonly fileSystemPort: any // FileSystemPort
  ) {}

  async setupLocalRepository(params: {
    repoFullName: string
    workingBranch: string
  }): Promise<Repository> {
    // This would delegate to the RepositoryService
    // For now, return a placeholder
    return Repository.fromFullName(params.repoFullName, params.workingBranch)
  }

  async getRepositoryMetadata(repoFullName: string): Promise<{
    fullName: string
    defaultBranch: string
    cloneUrl: string
  }> {
    const octokit = await this.getOctokit()
    if (!octokit) {
      throw new Error("Failed to get authenticated Octokit instance")
    }

    const [owner, repo] = repoFullName.split("/")
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    })

    return {
      fullName: repoFullName,
      defaultBranch: repoData.default_branch,
      cloneUrl: repoData.clone_url,
    }
  }

  async cleanupRepository(repository: Repository): Promise<void> {
    if (repository.localPath) {
      await this.fileSystemPort.deleteDirectory(repository.localPath)
    }
  }
}
