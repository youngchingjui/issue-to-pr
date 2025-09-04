import { type Result } from "@shared/entities/result"

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
 * Abstraction over GitHub for writing issue metadata.
 * Implementations can use REST or GraphQL.
 */
export interface IssueWriterPort {
  /**
   * Create an issue in a repository.
   * @param input
   */
  createIssue(
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>>
}
