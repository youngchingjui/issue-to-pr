import type { Repository } from "../0 core/entities/Repository.js"
import type {
  AuthenticationPort,
  FileSystemPort,
  GitPort,
  RepositoryPort,
} from "../0 core/ports/index.js"

export class RepositoryService {
  constructor(
    private readonly repositoryPort: RepositoryPort,
    private readonly fileSystemPort: FileSystemPort,
    private readonly gitPort: GitPort,
    private readonly authPort: AuthenticationPort
  ) {}

  async setupLocalRepository(params: {
    repoFullName: string
    workingBranch: string
  }): Promise<Repository> {
    const { repoFullName, workingBranch } = params

    // 1. Get repository metadata
    const metadata =
      await this.repositoryPort.getRepositoryMetadata(repoFullName)

    // 2. Create repository entity
    let repository = Repository.fromFullName(
      repoFullName,
      metadata.defaultBranch
    ).withCloneUrl(metadata.cloneUrl)

    // 3. Get authenticated clone URL
    const accessToken = await this.authPort.getAccessToken()
    let authenticatedCloneUrl = metadata.cloneUrl

    if (accessToken) {
      authenticatedCloneUrl = this.buildAuthenticatedUrl(
        repoFullName,
        accessToken
      )
    } else {
      // Fallback to installation token
      const installationToken = await this.authPort.getInstallationToken(
        repository.owner,
        repository.name
      )
      authenticatedCloneUrl = this.buildAuthenticatedUrl(
        repoFullName,
        installationToken
      )
    }

    repository = repository.withCloneUrl(authenticatedCloneUrl)

    // 4. Setup local directory
    const localPath = await this.setupLocalDirectory(repoFullName)
    repository = repository.withLocalPath(localPath)

    // 5. Ensure repository is valid and up to date
    await this.ensureValidRepository(repository, authenticatedCloneUrl)

    // 6. Clean checkout of working branch
    await this.cleanCheckoutBranch(repository, workingBranch)

    return repository
  }

  private async setupLocalDirectory(repoFullName: string): Promise<string> {
    const tempDir = this.fileSystemPort.getTempDir()
    const localPath = `${tempDir}/git-repos/${repoFullName}`

    if (!(await this.fileSystemPort.directoryExists(localPath))) {
      await this.fileSystemPort.createDirectory(localPath)
    }

    return localPath
  }

  private async ensureValidRepository(
    repository: Repository,
    cloneUrl: string
  ): Promise<void> {
    if (!repository.localPath) {
      throw new Error("Repository must have a local path")
    }

    const isValid = await this.gitPort.isGitRepository(repository.localPath)

    if (!isValid) {
      // Repository doesn't exist or is corrupted, clone it
      await this.gitPort.cloneRepository(cloneUrl, repository.localPath)
    } else {
      // Repository exists, fetch latest changes
      await this.gitPort.fetchLatest(repository.localPath)
    }

    // Ensure origin remote is set correctly
    await this.gitPort.setRemoteOrigin(repository.localPath, cloneUrl)
  }

  private async cleanCheckoutBranch(
    repository: Repository,
    branch: string
  ): Promise<void> {
    if (!repository.localPath) {
      throw new Error("Repository must have a local path")
    }

    // Retry logic for clean checkout
    let retries = 3
    while (retries > 0) {
      try {
        await this.gitPort.cleanCheckout(branch, repository.localPath)
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          throw error
        }

        // Re-clone on failure
        await this.repositoryPort.cleanupRepository(repository)
        await this.gitPort.cloneRepository(
          repository.cloneUrl!,
          repository.localPath
        )
      }
    }
  }

  private buildAuthenticatedUrl(repoFullName: string, token: string): string {
    return `https://${token}@github.com/${repoFullName}.git`
  }
}
