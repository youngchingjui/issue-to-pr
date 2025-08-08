import type { Octokit } from "octokit"

import { Repository } from "@/core/entities/Repository"
import type { FileSystemPort } from "@/core/ports/FileSystemPort"
import type { RepositoryPort } from "@/core/ports/RepositoryPort"

export class RepositoryAdapter implements RepositoryPort {
  constructor(
    private readonly getOctokit: () => Promise<Octokit>,
    private readonly fileSystemPort: FileSystemPort
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
    if (!owner || !repo) {
      throw new Error(
        `Invalid repository name format: ${repoFullName}. Expected format: owner/repo`
      )
    }

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
