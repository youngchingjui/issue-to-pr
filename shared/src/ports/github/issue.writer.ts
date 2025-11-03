import { type Result } from "@/entities/result"

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

export type CloseIssueInput = {
  owner: string
  repo: string
  number: number
}

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

  /**
   * Close an existing issue in a repository.
   */
  closeIssue(
    input: CloseIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>>
}
