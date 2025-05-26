import { z } from "zod"

import {
  addLabelsToPullRequest,
  createPullRequest,
  getPullRequestOnBranch,
} from "@/lib/github/pullRequests"
import { createTool } from "@/lib/tools/helper"
import { GitHubRepository } from "@/lib/types/github"

const createPRParameters = z.object({
  branch: z
    .string()
    .describe("The branch name to create the pull request from"),
  title: z.string().describe("The title of the pull request"),
  body: z.string().describe("The body/description of the pull request"),
})

type CreatePRParams = z.infer<typeof createPRParameters>

// Creates PR, then attempts to label it as "AI generated"
async function fnHandler(
  repository: GitHubRepository,
  issueNumber: number,
  params: CreatePRParams
): Promise<string> {
  const { branch, title, body } = params
  // Check if PR on branch already exists
  const existingPR = await getPullRequestOnBranch({
    repoFullName: repository.full_name,
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
      repoFullName: repository.full_name,
      branch,
      title,
      body,
      issueNumber,
    })
    let labelWarning: string | undefined
    try {
      // Add the "AI generated" label
      await addLabelsToPullRequest({
        repoFullName: repository.full_name,
        pullNumber: pr.data.number,
        labels: ["AI generated"],
      })
    } catch (labelError) {
      labelWarning = `Warning: PR created, but failed to add 'AI generated' label: ${String(labelError)}`
      // Optionally, could log here too
    }
    return JSON.stringify({
      status: "success",
      pullRequest: pr,
      ...(labelWarning ? { message: labelWarning } : {}),
    })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Failed to create pull request: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

export const createCreatePRTool = (
  repository: GitHubRepository,
  issueNumber: number
) =>
  createTool({
    name: "create_pull_request",
    description:
      "Creates a pull request from an existing remote branch and automatically adds the label 'AI generated'. The branch must already exist on GitHub and contain the changes you want to include in the PR.",
    schema: createPRParameters,
    handler: (params: CreatePRParams) =>
      fnHandler(repository, issueNumber, params),
  })
