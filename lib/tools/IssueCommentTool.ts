import { z } from "zod"

import { createIssueComment as createIssueCommentApi } from "@/lib/github/issues"
import { createTool } from "@/lib/tools/helper"

const issueCommentParameters = z.object({
  issueNumber: z
    .number()
    .describe("The issue or PR number to post the comment to"),
  repoFullName: z.string().describe("The full name of the repo (owner/repo)"),
  comment: z.string().describe("The comment body to post"),
})

type IssueCommentParams = z.infer<typeof issueCommentParameters>

export const createIssueCommentTool = (params: Partial<IssueCommentParams>) => {
  // Identify which params have been provided
  const providedKeys = Object.keys(params).filter(
    (key) => params[key as keyof IssueCommentParams] !== undefined
  ) as (keyof IssueCommentParams)[]

  // Omit provided params from the schema
  const updatedSchema = issueCommentParameters.omit(
    providedKeys.reduce(
      (acc, key) => {
        acc[key] = true
        return acc
      },
      {} as Record<keyof IssueCommentParams, true>
    )
  )

  return createTool<typeof updatedSchema, string>({
    name: "create_issue_comment",
    description:
      "Posts a comment to a GitHub issue or PR (PRs are issues in the GitHub API).",
    schema: updatedSchema,
    handler: async (newParams: z.infer<typeof updatedSchema>) => {
      const mergedParams = { ...params, ...newParams }
      const { issueNumber, repoFullName, comment } =
        issueCommentParameters.parse(mergedParams)
      const result = await createIssueCommentApi({
        issueNumber,
        repoFullName,
        comment,
      })
      return JSON.stringify(result)
    },
  })
}
