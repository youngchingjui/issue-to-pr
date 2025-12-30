import { type Result } from "@shared/entities/result"

export type PullRequestRef = {
  repoFullName: string // e.g. owner/repo
  number: number
}

export type PRState = "OPEN" | "CLOSED" | "MERGED"

export type PRAuthor = {
  login: string | null
}

export type PRBasicInfo = {
  number: number
  title: string
  body: string | null
  state: PRState
  isDraft: boolean
  merged: boolean
  mergedAt: string | null
  createdAt: string
  updatedAt: string
  baseRefName: string
  headRefName: string
  additions?: number
  deletions?: number
  changedFiles?: number
  author?: PRAuthor | null
}

export type PRFileChange = {
  path: string
  additions: number | null
  deletions: number | null
  changeType?: string | null
}

export type PRIssueLink = {
  number: number
  title: string | null
  state?: "OPEN" | "CLOSED"
}

export type PRIssueComment = {
  id: string
  body: string
  author: string | null
  createdAt: string
}

export type PRReviewComment = {
  id: string
  body: string
  author: string | null
  file: string
  position: number | null
  originalPosition: number | null
  diffHunk: string
  createdAt: string
  replyTo: string | null
  reviewId: string | null
}

export type PRReview = {
  id: string
  body: string
  state: string
  author: string | null
  submittedAt: string
  comments: PRReviewComment[]
}

export type PullRequestContext = {
  pullRequest: PRBasicInfo
  files?: PRFileChange[]
  linkedIssues?: PRIssueLink[]
  comments?: PRIssueComment[]
  reviews?: PRReview[]
}

export type PullRequestErrors =
  | "AuthRequired"
  | "RepoNotFound"
  | "RateLimited"
  | "ValidationFailed"
  | "Unknown"

export interface PullRequestReaderPort {
  /**
   * Fetch rich context for a pull request: basic PR info, linked issues, PR comments,
   * reviews with their comments, and changed files summary.
   */
  getPullRequestContext(
    ref: PullRequestRef
  ): Promise<Result<PullRequestContext, PullRequestErrors>>
}
