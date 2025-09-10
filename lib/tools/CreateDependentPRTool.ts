import { z } from "zod"

import {
  addLabelsToPullRequest,
  createPullRequestToBase,
  getPullRequestOnBranch,
} from "@/lib/github/pullRequests"
import { createTool } from "@/lib/tools/helper"

const createDependentPRParameters = z.object({
  branch: z
    .string()
    .trim()
    .min(1, "Branch name is required")
    .describe("The branch name that contains your changes"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(72, "Keep PR titles concise (<=72 chars)")
    .describe(
      "A clear, concise PR title. Do not include issue numbers unless necessary."
    ),
  body: z
    .string()
    .trim()
    .min(1, "Body is required")
    .describe(
      "A detailed description of what you changed and why, referencing review feedback you addressed."
    ),
})

type CreateDependentPRParams = z.infer<typeof createDependentPRParameters>

type MinimalPR = { number: number; html_url?: string; url?: string; title?: string }

async function handler(
  repoFullName: string,
  baseRefName: string,
  params: CreateDependentPRParams
): Promise<string> {
  const { branch, title, body } = params

  try {
    // Prevent duplicate PRs from same head branch
    const existingPR = (await getPullRequestOnBranch({
      repoFullName,
      branch,
    })) as MinimalPR | null
    if (existingPR) {
      return JSON.stringify({
        status: "error",
        message: `A pull request already exists for branch '${branch}'.`,
        pullRequest: {
          number: existingPR.number,
          url: existingPR.html_url ?? existingPR.url,
          title: existingPR.title,
        },
      })
    }

    const pr = await createPullRequestToBase({
      repoFullName,
      branch,
      base: baseRefName,
      title,
      body,
    })

    // Attempt to label the PR for traceability
    const DEPENDENT_PR_LABELS = ["AI generated", "dependent-pr"] as const
    try {
      await addLabelsToPullRequest({
        repoFullName,
        pullNumber: pr.data.number,
        labels: [...DEPENDENT_PR_LABELS],
      })
    } catch (labelError) {
      // Non-fatal; return a warning in the payload
      return JSON.stringify({
        status: "success",
        pullRequest: pr.data,
        message: `PR created but failed to add labels: ${String(labelError)}`,
      })
    }

    return JSON.stringify({ status: "success", pullRequest: pr.data })
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

