export interface RepositoryInfo {
  /** Full repository name (owner/repo) */
  fullName: string
  /** Repository owner */
  owner: string
  /** Repository name */
  name: string
  /** Default branch name */
  defaultBranch: string
  /** Clone URL */
  cloneUrl: string
  /** Whether repository is private */
  isPrivate: boolean
}

export interface BranchInfo {
  /** Branch name */
  name: string
  /** Whether this is the default branch */
  isDefault: boolean
  /** Last commit SHA */
  lastCommitSha: string
  /** Whether branch exists locally */
  existsLocally: boolean
  /** Whether branch exists remotely */
  existsRemotely: boolean
}

export interface CommitInfo {
  /** Commit SHA */
  sha: string
  /** Commit message */
  message: string
  /** Author name */
  author: string
  /** Author email */
  authorEmail: string
  /** Commit date */
  date: Date
}

export interface RepositoryReadPort {
  /**
   * Get information about a repository.
   * @param fullName - Full repository name (owner/repo)
   * @returns Promise with repository information
   * @throws Error if repository cannot be accessed
   */
  getRepositoryInfo(fullName: string): Promise<RepositoryInfo>

  /**
   * Check if a repository exists locally.
   * @param localPath - Local path to check
   * @returns Promise with boolean indicating if repository exists
   */
  repositoryExistsLocally(localPath: string): Promise<boolean>

  /**
   * Check if a repository is valid (not corrupted).
   * @param localPath - Local path to check
   * @returns Promise with boolean indicating if repository is valid
   */
  isRepositoryValid(localPath: string): Promise<boolean>

  /**
   * Get the current branch of a local repository.
   * @param localPath - Local repository path
   * @returns Promise with current branch name
   * @throws Error if repository is not valid or no branch is checked out
   */
  getCurrentBranch(localPath: string): Promise<string>

  /**
   * List all branches in a repository.
   * @param localPath - Local repository path
   * @returns Promise with array of branch information
   */
  listBranches(localPath: string): Promise<BranchInfo[]>

  /**
   * Get information about a specific branch.
   * @param localPath - Local repository path
   * @param branchName - Branch name
   * @returns Promise with branch information
   * @throws Error if branch doesn't exist
   */
  getBranchInfo(localPath: string, branchName: string): Promise<BranchInfo>

  /**
   * Get the remote URL for a repository.
   * @param localPath - Local repository path
   * @param remoteName - Remote name (default: 'origin')
   * @returns Promise with remote URL
   * @throws Error if remote doesn't exist
   */
  getRemoteUrl(localPath: string, remoteName?: string): Promise<string>

  /**
   * List all remotes for a repository.
   * @param localPath - Local repository path
   * @returns Promise with array of remote names and URLs
   */
  listRemotes(localPath: string): Promise<Array<{ name: string; url: string }>>

  /**
   * Get the latest commit information for a branch.
   * @param localPath - Local repository path
   * @param branchName - Branch name (default: current branch)
   * @returns Promise with commit information
   * @throws Error if branch doesn't exist or has no commits
   */
  getLatestCommit(localPath: string, branchName?: string): Promise<CommitInfo>

  /**
   * Check if there are uncommitted changes in the working directory.
   * @param localPath - Local repository path
   * @returns Promise with boolean indicating if there are uncommitted changes
   */
  hasUncommittedChanges(localPath: string): Promise<boolean>

  /**
   * Get the status of the working directory.
   * @param localPath - Local repository path
   * @returns Promise with working directory status
   */
  getWorkingDirectoryStatus(localPath: string): Promise<{
    modified: string[]
    added: string[]
    deleted: string[]
    untracked: string[]
  }>

  /**
   * Check if a specific file is tracked by git.
   * @param localPath - Local repository path
   * @param filePath - File path relative to repository root
   * @returns Promise with boolean indicating if file is tracked
   */
  isFileTracked(localPath: string, filePath: string): Promise<boolean>
}
