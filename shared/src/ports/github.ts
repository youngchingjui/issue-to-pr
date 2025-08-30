export interface RepoRef {
  owner: string
  name: string
}

export interface IssueRef {
  repoFullName: string // e.g. "owner/repo"
  number: number
}

export interface IssueTitleResult extends IssueRef {
  title: string | null
  state?: "OPEN" | "CLOSED"
}

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
}
