import { components } from "@octokit/openapi-types"
import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

export type GitHubRepository = components["schemas"]["full-repository"]

export type Tool<T extends z.ZodType> = {
  tool: ReturnType<typeof zodFunction>
  parameters: T
  handler: (params: z.infer<T>) => Promise<any>
}

export interface Issue {
  id: number
  number: number
  title: string
  body: string
  state: string
}
