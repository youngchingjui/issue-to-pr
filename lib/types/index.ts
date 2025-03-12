import { zodFunction } from "openai/helpers/zod"
import { ChatModel } from "openai/resources"
import { z } from "zod"

import { GitHubIssue } from "@/lib/types/github"

// Other
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
