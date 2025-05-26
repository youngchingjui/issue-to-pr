/**
 * @deprecated
 * This should be migrated to /lib/types/github folder,
 * With separate files for separate concerns (e.g., repo.ts, issue.ts, etc.).
 * This file will be removed after migration is complete.
 */
import { components } from "@octokit/openapi-types"
import { RestEndpointMethodTypes } from "@octokit/rest"
import { z } from "zod"

export * from "@/lib/types/github/index" // to help with migration
// GitHub API Types
export type GitHubRepository = components["schemas"]["full-repository"]
export type AuthenticatedUserRepository = components["schemas"]["repository"]
export type GitHubUser = components["schemas"]["simple-user"]
export type GitHubIssue = components["schemas"]["issue"]
export type GitHubIssueComment = components["schemas"]["issue-comment"]
export type IssueComment =
  RestEndpointMethodTypes["issues"]["listComments"]["response"]["data"][0]

export type PullRequestList =
  RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]
export type PullRequestSingle =
  RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]
export type PullRequest = PullRequestSingle | PullRequestList[0]

export type PullRequestReview =
  RestEndpointMethodTypes["pulls"]["listReviews"]["response"]["data"][0]
export type ListForRepoParams =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"]
export type SearchCodeItem = components["schemas"]["code-search-result-item"]

// Repository-specific types
declare const RepoFullNameBrand: unique symbol
export type RepoFullName = string & { readonly [RepoFullNameBrand]: never }

export function isValidRepoFullName(name: string): name is RepoFullName {
  return /^[^/]+\/[^/]+$/.test(name)
}

export function createRepoFullName(name: string): RepoFullName {
  if (!isValidRepoFullName(name)) {
    throw new Error('Repository name must be in the format "owner/repo"')
  }
  return name as RepoFullName
}

// Repository permissions types
export interface RepoPermissions {
  canPush: boolean
  canCreatePR: boolean
  reason?: string
}

// Application-specific types
export type WorkflowType =
  | "Generating Plan..."
  | "Creating PR..."
  | "Reviewing PR..."
  | "Identifying Goal..."

// Extended types for our application
export type GitHubItem = GitHubIssue & {
  type: "issue" | "pull"
}

// zod
export const IssueOrderFieldSchema = z
  .enum(["CREATED", "UPDATED", "INTERACTIONS", "REACTIONS"])
  .default("CREATED")
export type IssueOrderField = z.infer<typeof IssueOrderFieldSchema>
