import { type Result } from "@/entities/result"

export interface IssueRef {
  repoFullName: string // e.g. "owner/repo"
  number: number
}

export interface IssueTitleResult extends IssueRef {
  title: string | null
  state?: "OPEN" | "CLOSED"
}

// Key properties needed by auto-resolve and planning workflows
// Keep this minimal and provider-agnostic
export interface IssueDetails extends IssueRef {
  title: string | null
  body: string | null
  state: "OPEN" | "CLOSED"
  url: string
  authorLogin: string | null
  labels: string[] // label names only
  assignees: string[] // assignee logins only
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  closedAt?: string | null // ISO timestamp or null when open
}

// Minimal list item for repo issue lists (provider-agnostic)
export interface IssueListItem {
  id: number
  repoFullName: string
  number: number
  title: string | null
  state: "OPEN" | "CLOSED"
  url: string
  authorLogin: string | null
  createdAt: string
  updatedAt: string
  closedAt?: string | null
}

export type GetIssueErrors =
  | "AuthRequired"
  | "RepoNotFound"
  | "NotFound"
  | "Forbidden"
  | "IssuesDisabled"
  | "RateLimited"
  | "Unknown"

export type AuthErrors = "AuthRequired" | "Unknown"

export interface ListIssuesParams {
  repoFullName: string
  page?: number
  per_page?: number
  state?: "open" | "closed" | "all"
}

/**
 * Abstraction over GitHub for reading issue metadata.
 */
export interface IssueReaderPort {
  /**
   * Fetch a single issue with key properties used across workflows.
   */
  getIssue(ref: IssueRef): Promise<Result<IssueDetails, GetIssueErrors>>

  /**
   * Batch fetch issue titles for a set of (repo, number) pairs.
   * Implementations should be resilient to partial failures and return null titles when not found.
   */
  getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]>

  /**
   * List issues for a repository. Should exclude pull requests.
   */
  listForRepo(
    params: ListIssuesParams
  ): Promise<Result<IssueListItem[], GetIssueErrors>>
}

/**
 * Authentication methods for GitHub API access
 */
export type GitHubAuthMethod =
  | { type: "oauth_user"; token: string } // Github App user-to-server OAuth
  | {
      type: "app_installation"
      appId: number | string
      privateKey: string
      installationId: number | string
    } // Github App server-to-server

export interface IssueReaderFactoryPort {
  authorize(
    input: GitHubAuthMethod
  ): Promise<Result<IssueReaderPort, AuthErrors>>
}
