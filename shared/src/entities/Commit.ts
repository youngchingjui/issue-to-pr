/**
 * Domain representation of a Git commit
 *
 * Contains only what the business logic and UI need.
 * For full commit data (author, committer, tree, etc.), see the port layer.
 */
export interface Commit {
  /**
   * Git commit SHA-1 hash (40 hex characters)
   * Unique identifier for the commit
   */
  sha: string

  /**
   * Commit message (first line or full message)
   * Used for display in UI and logs
   */
  message: string

  repository: {
    fullName: string
  }
}
