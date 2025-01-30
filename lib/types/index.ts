import { components } from "@octokit/openapi-types"
import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

export type GitHubRepository = components["schemas"]["full-repository"]
export type AuthenticatedUserRepository = components["schemas"]["repository"]
export type GitHubUser = components["schemas"]["simple-user"]
export type GitHubIssueComment = components["schemas"]["issue-comment"]

export interface Tool<T extends z.ZodType, U = unknown> {
  tool: ReturnType<typeof zodFunction>
  parameters: T
  handler: (params: z.infer<T>, ...args: U[]) => Promise<string>
}

export interface Issue {
  id: number
  number: number
  title: string
  body: string
  state: string
}
