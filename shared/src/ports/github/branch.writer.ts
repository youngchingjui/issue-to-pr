import type { Result } from "@/shared/entities/result"

export type CreateBranchInput = {
  /** e.g. "owner/repo" */
  repoFullName: string
  /** new branch name, e.g. "feature/foo" */
  branch: string
  /** base branch to branch from (defaults to "main") */
  baseBranch?: string
}

export type BranchRef = {
  /** full ref name, e.g. "refs/heads/feature/foo" */
  ref: string
  /** commit SHA the ref points to */
  sha: string
}

export type CreateBranchErrors =
  | "AuthRequired"
  | "RepoNotFound"
  | "Forbidden"
  | "BranchAlreadyExists"
  | "RateLimited"
  | "ValidationFailed"
  | "Unknown"

export interface BranchWriterPort {
  /**
   * Create a new branch from a base branch.
   * Implementations should fetch the base branch SHA and create the ref.
   */
  createBranch(
    input: CreateBranchInput
  ): Promise<Result<BranchRef, CreateBranchErrors>>
}
