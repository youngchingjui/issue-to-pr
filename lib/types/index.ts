import { components } from "@octokit/openapi-types"
import { RestEndpointMethodTypes } from "@octokit/rest"
import { zodFunction } from "openai/helpers/zod"
import { ChatModel } from "openai/resources"
import { z } from "zod"

export type GitHubRepository = components["schemas"]["full-repository"]
export type AuthenticatedUserRepository = components["schemas"]["repository"]
export type GitHubUser = components["schemas"]["simple-user"]
export type GitHubIssue = components["schemas"]["issue"]
export type GitHubIssueComment = components["schemas"]["issue-comment"]
export type IssueComment =
  RestEndpointMethodTypes["issues"]["listComments"]["response"]["data"][0]
export type PullRequest =
  RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0]
export type PullRequestReview =
  RestEndpointMethodTypes["pulls"]["listReviews"]["response"]["data"][0]
export type ListForRepoParams =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"]
export type SearchCodeItem = components["schemas"]["code-search-result-item"]

export interface Tool<T extends z.ZodType, U = unknown> {
  tool: ReturnType<typeof zodFunction>
  parameters: T
  handler: (params: z.infer<T>, ...args: U[]) => Promise<string>
}

export type ThinkerAgentParams = Omit<
  AgentConstructorParams,
  "systemPrompt"
> & {
  issue: GitHubIssue
  tree?: string[]
}

export type AgentConstructorParams = {
  model?: ChatModel
  systemPrompt?: string
  apiKey?: string
}
