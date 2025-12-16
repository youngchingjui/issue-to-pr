import { z } from "zod"

import { updatePullRequestBody } from "@/lib/github/pullRequests"
import { createTool } from "@/lib/tools/helper"

const updatePullRequestBodyParameters = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Body is required")
    .describe(
      "The complete pull request description to set. Include both the original context (if you choose to preserve it) and any updates made in this run."
    ),
})

type UpdatePullRequestBodyParams = z.infer<typeof updatePullRequestBodyParameters>

async function handler(
  repoFullName: string,
  pullNumber: number,
  params: UpdatePullRequestBodyParams
): Promise<string> {
  const { body } = params
  try {
    await updatePullRequestBody({ repoFullName, pullNumber, body })
    return JSON.stringify({ status: "success" })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message:
        error instanceof Error ? error.message : `Failed to update PR body: ${String(error)}`,
    })
  }
}

export const createUpdatePullRequestBodyTool = (
  repoFullName: string,
  pullNumber: number
) =>
  createTool({
    name: "update_pull_request_body",
    description:
      "Updates the pull request description (body). Use this to write a clear update note summarizing the changes you pushed and the feedback addressed.",
    schema: updatePullRequestBodyParameters,
    handler: (params: UpdatePullRequestBodyParams) => handler(repoFullName, pullNumber, params),
  })

