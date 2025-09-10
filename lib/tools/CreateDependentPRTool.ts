import { z } from "zod"

import {
  addLabelsToPullRequest,
  createPullRequestToBase,
  getPullRequestOnBranch,
} from "@/lib/github/pullRequests"
import { createTool } from "@/lib/tools/helper"

const createDependentPRParameters = z.object({
  branch: z.string().describe("The branch name that contains your changes"),
  title: z
    .string()
    .describe(
      "A clear, concise PR title. Do not include issue numbers unless necessary."
    ),
  body: z
    .string()
    .describe(
      "A detailed description of what you changed and why, referencing review feedback you addressed."
    ),
})

type CreateDependentPRParams = z.infer<typeof createDependentPRParameters>

async function handler(
  repoFullName: string,
  baseRefName: string,
  params: CreateDependentPRParams
): Promise<string> {
  const { branch, title, body } = params

  // Prevent duplicate PRs from same head branch
  const existingPR = await getPullRequestOnBranch({
    repoFullName,
    branch,
  })
  if (existingPR) {
    return JSON.stringify({
      status: "error",
      message: `A pull request already exists for branch '${branch}'. PR: ${existingPR}`,
    })
  }

  try {
    const pr = await createPullRequestToBase({
      repoFullName,
      branch,
      base: baseRefName,
      title,
      body,
    })

    // Attempt to label the PR for traceability
    try {
      await addLabelsToPullRequest({
        repoFullName,
        pullNumber: pr.data.number,
        labels: ["AI generated", "dependent-pr"],
      })
    } catch (labelError) {
      // Non-fatal; return a warning in the payload
      return JSON.stringify({
        status: "success",
        pullRequest: pr,
        message: `PR created but failed to add labels: ${String(labelError)}`,
      })
    }

    return JSON.stringify({ status: "success", pullRequest: pr })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Failed to create dependent PR: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

export const createCreateDependentPRTool = (
  repoFullName: string,
  baseRefName: string
) =>
  createTool({
    name: "create_dependent_pull_request",
    description:
      "Creates a dependent PR that targets a specified base branch (e.g., the original PR's head). Use this after pushing your follow-up branch.",
    schema: createDependentPRParameters,
    handler: (params: CreateDependentPRParams) =>
      handler(repoFullName, baseRefName, params),
  })

