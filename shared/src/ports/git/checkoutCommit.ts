// shared/src/ports/git/checkoutCommit.ts
import type { Result } from "@/entities/result"

export type CheckoutCommitInput = {
  /** Commit SHA to base the working branch on */
  sha: string
  /** Name of the working branch to (re)create pointing at sha */
  branch: string
}

export type CheckoutCommitErrors =
  | "RepoNotFound"
  | "CommitNotFound"
  | "GitCommandFailed"
  | "Unknown"

export interface CheckoutCommitPort {
  /**
   * Ensure a working branch points at the given commit.
   *
   * Implementations should:
   * - Fetch so that `sha` exists locally
   * - Verify the commit exists
   * - Checkout the commit (usually detached)
   * - Create/reset `branch` to point at that commit
   */
  checkoutCommit(
    container: string,
    input: CheckoutCommitInput
  ): Promise<Result<void, CheckoutCommitErrors>>
}
