import { components } from "@octokit/openapi-types"
import { RestEndpointMethodTypes } from "@octokit/rest"

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
