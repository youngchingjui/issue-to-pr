export interface CloneOptions {
  /** Branch to checkout after cloning */
  branch?: string
  /** Depth for shallow clone (number of commits to fetch) */
  depth?: number
  /** Whether to perform a shallow clone */
  shallow?: boolean
  /** Whether to checkout a single branch only */
  singleBranch?: boolean
}

export interface FetchOptions {
  /** Remote to fetch from (default: 'origin') */
  remote?: string
  /** Whether to prune remote-tracking branches */
  prune?: boolean
  /** Whether to fetch all remotes */
  all?: boolean
}

export interface CheckoutOptions {
  /** Whether to create the branch if it doesn't exist */
  create?: boolean
  /** Whether to force checkout (discard local changes) */
  force?: boolean
  /** Whether to track the remote branch */
  track?: boolean
}

export interface RepositoryWritePort {
  /**
   * Clone a repository to a local directory.
   * @param cloneUrl - URL to clone from
   * @param localPath - Local path where to clone
   * @param options - Clone options
   * @returns Promise that resolves when clone is complete
   * @throws Error if clone operation fails
   */
  clone(
    cloneUrl: string,
    localPath: string,
    options?: CloneOptions
  ): Promise<void>

  /**
   * Fetch updates from remote repository.
   * @param localPath - Local repository path
   * @param options - Fetch options
   * @returns Promise that resolves when fetch is complete
   * @throws Error if fetch operation fails
   */
  fetch(localPath: string, options?: FetchOptions): Promise<void>

  /**
   * Pull latest changes from remote repository.
   * @param localPath - Local repository path
   * @param branch - Branch to pull (default: current branch)
   * @returns Promise that resolves when pull is complete
   * @throws Error if pull operation fails
   */
  pull(localPath: string, branch?: string): Promise<void>

  /**
   * Checkout a specific branch.
   * @param localPath - Local repository path
   * @param branchName - Branch name to checkout
   * @param options - Checkout options
   * @returns Promise that resolves when checkout is complete
   * @throws Error if checkout operation fails
   */
  checkout(
    localPath: string,
    branchName: string,
    options?: CheckoutOptions
  ): Promise<void>

  /**
   * Create a new branch.
   * @param localPath - Local repository path
   * @param branchName - Name of the new branch
   * @param startPoint - Starting point for the new branch (default: current branch)
   * @returns Promise that resolves when branch is created
   * @throws Error if branch creation fails
   */
  createBranch(
    localPath: string,
    branchName: string,
    startPoint?: string
  ): Promise<void>

  /**
   * Delete a branch.
   * @param localPath - Local repository path
   * @param branchName - Name of the branch to delete
   * @param force - Whether to force delete (default: false)
   * @returns Promise that resolves when branch is deleted
   * @throws Error if branch deletion fails
   */
  deleteBranch(
    localPath: string,
    branchName: string,
    force?: boolean
  ): Promise<void>

  /**
   * Set the remote URL for a repository.
   * @param localPath - Local repository path
   * @param remoteName - Remote name (default: 'origin')
   * @param url - Remote URL
   * @returns Promise that resolves when remote is set
   * @throws Error if remote setting fails
   */
  setRemoteUrl(
    localPath: string,
    remoteName: string,
    url: string
  ): Promise<void>

  /**
   * Add a remote to the repository.
   * @param localPath - Local repository path
   * @param remoteName - Name of the remote
   * @param url - Remote URL
   * @returns Promise that resolves when remote is added
   * @throws Error if remote addition fails
   */
  addRemote(localPath: string, remoteName: string, url: string): Promise<void>

  /**
   * Remove a remote from the repository.
   * @param localPath - Local repository path
   * @param remoteName - Name of the remote to remove
   * @returns Promise that resolves when remote is removed
   * @throws Error if remote removal fails
   */
  removeRemote(localPath: string, remoteName: string): Promise<void>

  /**
   * Reset the repository to a specific state.
   * @param localPath - Local repository path
   * @param target - Target to reset to (commit SHA, branch, or 'HEAD')
   * @param mode - Reset mode ('soft', 'mixed', 'hard')
   * @returns Promise that resolves when reset is complete
   * @throws Error if reset operation fails
   */
  reset(
    localPath: string,
    target: string,
    mode?: "soft" | "mixed" | "hard"
  ): Promise<void>

  /**
   * Clean the working directory (remove untracked files).
   * @param localPath - Local repository path
   * @param force - Whether to force clean (default: false)
   * @returns Promise that resolves when clean is complete
   * @throws Error if clean operation fails
   */
  clean(localPath: string, force?: boolean): Promise<void>

  /**
   * Create a git worktree.
   * @param localPath - Local repository path
   * @param worktreePath - Path for the new worktree
   * @param branchName - Branch name for the worktree
   * @returns Promise that resolves when worktree is created
   * @throws Error if worktree creation fails
   */
  createWorktree(
    localPath: string,
    worktreePath: string,
    branchName: string
  ): Promise<void>

  /**
   * Remove a git worktree.
   * @param localPath - Local repository path
   * @param worktreePath - Path of the worktree to remove
   * @param force - Whether to force removal (default: false)
   * @returns Promise that resolves when worktree is removed
   * @throws Error if worktree removal fails
   */
  removeWorktree(
    localPath: string,
    worktreePath: string,
    force?: boolean
  ): Promise<void>

  /**
   * Initialize a new git repository.
   * @param localPath - Local path where to initialize the repository
   * @param bare - Whether to create a bare repository (default: false)
   * @returns Promise that resolves when repository is initialized
   * @throws Error if initialization fails
   */
  init(localPath: string, bare?: boolean): Promise<void>

  /**
   * Remove the entire repository directory.
   * @param localPath - Local repository path
   * @returns Promise that resolves when repository is removed
   * @throws Error if removal fails
   */
  removeRepository(localPath: string): Promise<void>
}
