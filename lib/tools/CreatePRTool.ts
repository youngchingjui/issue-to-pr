import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import {
  createPullRequest,
  getPullRequestOnBranch,
} from "@/lib/github/pullRequests"
import { Tool } from "@/lib/types"
import { GitHubRepository } from "@/lib/types/github"

const createPRParameters = z.object({
  branch: z
    .string()
    .describe("The branch name to create the pull request from"),
  title: z.string().describe("The title of the pull request"),
  body: z.string().describe("The body/description of the pull request"),
})

class CreatePRTool implements Tool<typeof createPRParameters> {
  repository: GitHubRepository
  issueNumber: number

  constructor(repository: GitHubRepository, issueNumber: number) {
    this.repository = repository
    this.issueNumber = issueNumber
  }

  parameters = createPRParameters
  tool = zodFunction({
    name: "create_pull_request",
    parameters: createPRParameters,
    description:
      "Creates a pull request from an existing remote branch. The branch must already exist on GitHub and contain the changes you want to include in the PR.",
  })

  async handler(params: z.infer<typeof createPRParameters>) {
    const { branch, title, body } = params

    // Check if PR on branch already exists
    const existingPR = await getPullRequestOnBranch({
      repoFullName: this.repository.full_name,
      branch,
    })
    if (existingPR) {
      return JSON.stringify({
        status: "error",
        message: `A pull request already exists for branch '${branch}'. PR: ${existingPR}`,
      })
    }

    // Create the pull request
    try {
      const pr = await createPullRequest({
        repoFullName: this.repository.full_name,
        branch,
        title,
        body,
        issueNumber: this.issueNumber,
      })

      return JSON.stringify({
        status: "success",
        pullRequest: pr,
      })
    } catch (error) {
      return JSON.stringify({
        status: "error",
        message: `Failed to create pull request: ${error.message || error}`,
      })
    }
  }
}

export default CreatePRTool
