export interface GitPort {
  /**
   * Clone a repository to a local directory
   */
  cloneRepository(cloneUrl: string, localPath: string): Promise<void>

  /**
   * Check if a directory is a valid git repository
   */
  isGitRepository(path: string): Promise<boolean>

  /**
   * Fetch latest changes from remote
   */
  fetchLatest(path: string): Promise<void>

  /**
   * Checkout a specific branch
   */
  checkoutBranch(branch: string, path: string): Promise<void>

  /**
   * Set the origin remote URL
   */
  setRemoteOrigin(path: string, remoteUrl: string): Promise<void>

  /**
   * Clean untracked files and reset to origin
   */
  cleanCheckout(branch: string, path: string): Promise<void>

  /**
   * Get the current branch name
   */
  getCurrentBranch(path: string): Promise<string>

  /**
   * Create a new branch
   */
  createBranch(branchName: string, path: string): Promise<void>

  /**
   * Push a branch to remote
   */
  pushBranch(branchName: string, path: string): Promise<void>
}
