import { type Result } from "@shared/entities/result"

export interface IssueRef {
  repoFullName: string // e.g. "owner/repo"
  number: number
}

export interface IssueTitleResult extends IssueRef {
  title: string | null
  state?: "OPEN" | "CLOSED"
}

export type CreateIssueInput = {
  owner: string
  repo: string
  title: string
  body?: string
}

export type Issue = { id: number; number: number; url: string }

export type GithubIssueErrors =
  | "AuthRequired"
  | "RepoNotFound"
  | "IssuesDisabled"
  | "RateLimited"
  | "ValidationFailed"
  | "Unknown"

/**
 * Abstraction over GitHub for reading issue metadata.
 * Implementations can use REST or GraphQL.
 */
export interface GitHubIssuesPort {
  /**
   * Batch fetch issue titles for a set of (repo, number) pairs.
   * Implementations should be resilient to partial failures and return null titles when not found.
   */
  getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]>

  /**
   * Create an issue in a repository.
   * @param input
   */
  createIssue(
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>>
}
