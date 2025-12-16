import { updatePullRequestBody } from "@shared/adapters/github/octokit/graphql/pullRequest.writer"
import { createTool } from "@shared/lib/tools/helper"
import { GitHubAuthProvider, GitHubAuthTarget } from "@shared/ports/github/auth"
import { z } from "zod"

const updatePullRequestBodyParameters = z.object({
  appendedBody: z
    .string()
    .trim()
    .min(1, "Appended body is required")
    .describe(
      "ONLY the new PR body update section to append to the existing description. Do NOT repeat or rewrite the existing PR body; the system will append your update to it."
    ),
})

type UpdatePullRequestBodyParams = z.infer<
  typeof updatePullRequestBodyParameters
>

type UpdatePRToolContext = {
  owner: string
  repo: string
  pullNumber: number
  /** The current/original PR body before this agent run */
  originalBody: string
}

type UpdatePRToolAuth = {
  authProvider: GitHubAuthProvider
  authTarget: GitHubAuthTarget
}

async function handler(
  ctx: UpdatePRToolContext,
  params: UpdatePullRequestBodyParams,
  auth: UpdatePRToolAuth
): Promise<string> {
  const { owner, repo, pullNumber, originalBody } = ctx
  const { appendedBody } = params
  const { authProvider, authTarget } = auth

  const divider = "\n\n---\n\n"
  const trimmedOriginal = (originalBody ?? "").trim()
  const trimmedUpdate = appendedBody.trim()
  const nextBody =
    trimmedOriginal.length > 0
      ? `${trimmedOriginal}${divider}${trimmedUpdate}`
      : trimmedUpdate

  try {
    const result = await updatePullRequestBody(
      {
        owner,
        repo,
        pullNumber,
        body: nextBody,
      },
      { authProvider, authTarget }
    )
    return JSON.stringify(result)
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : `Failed to update PR body: ${String(error)}`,
    })
  }
}

export const createUpdatePullRequestBodyTool = (
  ctx: UpdatePRToolContext,
  auth: UpdatePRToolAuth
) =>
  createTool({
    name: "update_pull_request_body",
    description:
      "Appends a new update section to the existing pull request description (body). Provide ONLY the new update content: a clear audit trail of what changed in this run, which comments/reviews were addressed (with links), and any relevant notes.",
    schema: updatePullRequestBodyParameters,
    handler: (params: UpdatePullRequestBodyParams) =>
      handler(ctx, params, auth),
  })

