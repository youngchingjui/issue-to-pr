import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { getPullRequestDiff } from "@/lib/github/pullRequests"
import { Tool } from "@/lib/types"
import { GitHubRepository } from "@/lib/types"

const getPRGoalParameters = z.object({
  issueNumber: z.number().optional(),
})

class GetPRGoalTool implements Tool<typeof getPRGoalParameters> {
  private repo: GitHubRepository
  private pullNumber: number

  constructor({
    repo,
    pullNumber,
  }: {
    repo: GitHubRepository
    pullNumber: number
  }) {
    this.repo = repo
    this.pullNumber = pullNumber
  }

  parameters = getPRGoalParameters

  tool = zodFunction({
    name: "get_pr_goal",
    parameters: getPRGoalParameters,
    description:
      "Analyzes a pull request and its linked issue (if any) to identify the goal of the changes.",
  })

  async handler({
    issueNumber,
  }: z.infer<typeof getPRGoalParameters>): Promise<string> {
    // Get PR diff
    const diff = await getPullRequestDiff({
      repoFullName: this.repo.full_name,
      pullNumber: this.pullNumber,
    })

    // If we have an issue number, get the issue details
    let issueDetails = null
    if (issueNumber) {
      issueDetails = await getIssue({
        fullName: this.repo.full_name,
        issueNumber,
      })
    }

    // Return JSON string containing the PR information
    return JSON.stringify({
      diff,
      issueDetails,
    })
  }
}

export default GetPRGoalTool
