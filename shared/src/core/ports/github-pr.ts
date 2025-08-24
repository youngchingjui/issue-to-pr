// Minimal GitHub port interfaces used by PR comment analysis workflows.
// Keeping ports small and focused supports clean-architecture layering.

export type MinimalIssue = {
  repoFullName: string
  number: number
  title?: string | null
  body?: string | null
}

export type MinimalPR = {
  repoFullName: string
  number: number
  title: string
  body?: string | null
}

export type MinimalPRGeneralComment = {
  author?: string | null
  body: string
  createdAt?: string
}

export type MinimalPRReviewComment = {
  author?: string | null
  body: string
  file?: string | null
  diffHunk?: string | null
  createdAt?: string
}

export interface GitHubPRReadPort {
  getPR(params: { repoFullName: string; pullNumber: number }): Promise<MinimalPR>
  getPRComments(params: {
    repoFullName: string
    pullNumber: number
  }): Promise<MinimalPRGeneralComment[]>
  getPRReviewComments?(params: {
    repoFullName: string
    pullNumber: number
  }): Promise<MinimalPRReviewComment[]>
  getLinkedIssuesForPR(params: {
    repoFullName: string
    pullNumber: number
  }): Promise<number[]>
  getIssue(params: {
    repoFullName: string
    issueNumber: number
  }): Promise<MinimalIssue | null>
}

export interface GitHubIssueWritePort {
  createIssueComment(params: {
    repoFullName: string
    issueNumber: number
    body: string
  }): Promise<void>
}

