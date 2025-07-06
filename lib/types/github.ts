import { components } from "@octokit/openapi-types"
import { RestEndpointMethodTypes } from "@octokit/rest"
import { z } from "zod"

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
export type PullRequestReviewComment =
  RestEndpointMethodTypes["pulls"]["listReviewComments"]["response"]["data"][0]
export type ListForRepoParams =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"]
export type SearchCodeItem = components["schemas"]["code-search-result-item"]

// Repository-specific types
export const repoFullNameSchema = z
  .string()
  .regex(
    /^[^/]+\/[^/]+$/,
    "'Repository name must be in the format 'owner/repo'"
  )
  .transform((str) => {
    const [owner, repo] = str.split("/")
    return {
      owner,
      repo,
      fullName: str,
    }
  })

export type RepoFullName = z.infer<typeof repoFullNameSchema>

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

export type RepoSelectorItem = {
  name: string
  nameWithOwner: string
  description: string | null
  updatedAt: string
}

// ---
// Structured Result Type for getIssue
export type GetIssueResult =
  | { type: "success"; issue: GitHubIssue }
  | { type: "not_found" }
  | { type: "forbidden" }
  | { type: "other_error"; error: unknown }
