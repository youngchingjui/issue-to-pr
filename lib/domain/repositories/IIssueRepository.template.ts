// TEMPLATE: Example of how to structure repository interfaces
// Remove this file once the real IIssueRepository interface is implemented

import { Issue } from "../entities/Issue.template"

// ✅ Repository interfaces belong in domain layer (implementations in infrastructure)
export interface IIssueRepository {
  // ✅ Use domain entities, not DTOs or raw data
  getByNumber(issueNumber: number, repoFullName: string): Promise<Issue>

  // ✅ Domain-focused method names
  save(issue: Issue): Promise<void>
  delete(issue: Issue): Promise<void>

  // ✅ Query methods return domain entities
  findOpenIssuesByRepo(repoFullName: string): Promise<Issue[]>
  findByAssignee(assignee: string): Promise<Issue[]>

  // ✅ Domain-specific queries
  findAutoResolvableCandidates(repoFullName: string): Promise<Issue[]>
}

// ✅ Additional repository for complex queries (follows Interface Segregation Principle)
export interface IIssueQueryRepository {
  // ✅ Read-only queries separated from write operations
  getIssueStatistics(repoFullName: string): Promise<IssueStatistics>
  searchIssues(criteria: IssueSearchCriteria): Promise<Issue[]>
}

// ✅ Domain value objects for query parameters
export interface IssueSearchCriteria {
  repoFullName: string
  state?: "open" | "closed"
  assignee?: string
  createdAfter?: Date
  labels?: string[]
}

export interface IssueStatistics {
  total: number
  open: number
  closed: number
  autoResolvableCandidates: number
}
