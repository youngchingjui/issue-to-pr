import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { Agent as BaseAgent } from "@/lib/agents/base"
import { GetPRGoalTool } from "@/lib/tools"
import { AgentConstructorParams, GitHubRepository } from "@/lib/types"

const SYSTEM_PROMPT = `You are an expert code reviewer focused on understanding the goals and intentions behind pull requests.
Your task is to analyze pull requests and their associated issues (if any) to identify:

1. The primary goal of the changes
2. Any secondary objectives or side effects
3. Whether the changes align with the linked issue (if present)
4. Whether there are any changes that seem unrelated to the main goal

Base your analysis on:
- The PR's diff content
- The linked issue description and comments (if available)
- The overall context of the changes

Provide your analysis in a clear, structured format that helps developers understand the PR's purpose and scope.`

export class GoalIdentifierAgent extends BaseAgent {
  private repo: GitHubRepository
  private pullNumber: number

  constructor({
    repo,
    pullNumber,
    ...rest
  }: {
    repo: GitHubRepository
    pullNumber: number
  } & AgentConstructorParams) {
    super(rest)
    this.repo = repo
    this.pullNumber = pullNumber

    // Set up the agent
    this.setSystemPrompt(SYSTEM_PROMPT)
    this.addTool(
      new GetPRGoalTool({
        repo: this.repo,
        pullNumber: this.pullNumber,
      })
    )
  }

  async run(messages: ChatCompletionMessageParam[]): Promise<string> {
    // Add the messages to the agent
    messages.forEach((message) => this.addMessage(message))

    // Run the agent with the tools
    return this.runWithFunctions()
  }
}

export default GoalIdentifierAgent
