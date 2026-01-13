import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { createTool } from "@/lib/tools/helper"
import { GitHubRepository } from "@/lib/types/github"

const getIssueParameters = z.object({
  issueNumber: z.number(),
})

type GetIssueParams = z.infer<typeof getIssueParameters>

async function fnHandler(
  repo: GitHubRepository,
  params: GetIssueParams
): Promise<string> {
  const { issueNumber } = params
  const issue = await getIssue({
    fullName: repo.full_name,
    issueNumber,
  })
  return JSON.stringify(issue)
}

export const createGetIssueTool = (repo: GitHubRepository) =>
  createTool({
    name: "get_issue",
    description:
      "Retrieves a GitHub issue by its number. Use this when you find references to issues in PR descriptions (e.g., 'Fixes #123' or 'Related to #456').",
    schema: getIssueParameters,
    handler: (params: GetIssueParams) => fnHandler(repo, params),
  })
