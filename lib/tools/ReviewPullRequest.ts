import { zodFunction } from "openai/helpers/zod"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getDiff } from "@/lib/git"
import { Tool } from "@/lib/types"
import { GitHubIssue, GitHubRepository } from "@/lib/types/github"
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
  private jobId?: string

  constructor({
    repo,
    issue,
    pullNumber,
    baseDir,
    apiKey,
    jobId,
  }: {
    repo: GitHubRepository
    issue: GitHubIssue
    pullNumber?: number
    diff?: string
    baseDir: string
    apiKey: string
    jobId?: string
  }) {
    this.repo = repo
    this.issue = issue
    this.pullNumber = pullNumber
    this.baseDir = baseDir
    this.apiKey = apiKey
    this.jobId = jobId
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

    if (!this.diff) {
      return "No pull request number was provided , and no file changes were detected."
    }

    if (!this.jobId) {
      this.jobId = uuidv4()
    }

    const response = await reviewPullRequest({
      repoFullName: this.repo.full_name,
      issue: this.issue,
      pullNumber: this.pullNumber,
      diff: this.diff,
      baseDir: this.baseDir,
      apiKey: this.apiKey,
      jobId: this.jobId,
    })

    const lastMessage = response.messages[response.messages.length - 1]

    if (typeof lastMessage.content !== "string") {
      throw new Error(
        `Last message content is not a string. Here's the content: ${JSON.stringify(
          lastMessage.content
        )}`
      )
    }

    return lastMessage.content
  }
}

export default ReviewPullRequestTool
