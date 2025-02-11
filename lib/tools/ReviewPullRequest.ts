import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { getDiff } from "@/lib/git"
import { Tool } from "@/lib/types"
import { GitHubIssue, GitHubRepository } from "@/lib/types"
import { reviewPullRequest } from "@/lib/workflows/reviewPullRequest"

const reviewPullRequestParameters = z.object({})

class ReviewPullRequestTool
  implements Tool<typeof reviewPullRequestParameters>
{
  private repo: GitHubRepository
  private issue: GitHubIssue
  private pullNumber?: number
  private diff?: string
  private baseDir: string
  private apiKey: string

  constructor({
    repo,
    issue,
    pullNumber,
    baseDir,
    apiKey,
  }: {
    repo: GitHubRepository
    issue: GitHubIssue
    pullNumber?: number
    diff?: string
    baseDir: string
    apiKey: string
  }) {
    this.repo = repo
    this.issue = issue
    this.pullNumber = pullNumber
    this.baseDir = baseDir
    this.apiKey = apiKey
  }

  parameters = reviewPullRequestParameters
  tool = zodFunction({
    name: "review_pull_request",
    parameters: reviewPullRequestParameters,
    description:
      "Calls the reviewPullRequest function to review a pull request. Run this before creating a pull request.",
  })

  async handler() {
    // Populate diff if pullNumber not present
    if (!this.pullNumber) {
      this.diff = await getDiff(this.baseDir)
    }

    return await reviewPullRequest({
      repo: this.repo,
      issue: this.issue,
      pullNumber: this.pullNumber,
      diff: this.diff,
      baseDir: this.baseDir,
      apiKey: this.apiKey,
    })
  }
}

export default ReviewPullRequestTool
