import type { Result } from "@/shared/src/entities/result"

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

export interface GithubIssuesWritePort {
  createIssue(input: CreateIssueInput): Promise<Result<Issue, GithubIssueErrors>>
}

