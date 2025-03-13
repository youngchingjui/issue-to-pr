import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { Tool } from "@/lib/types"
import { GitHubRepository } from "@/lib/types/github"

const getIssueParameters = z.object({
  issueNumber: z.number(),
})

class GetIssueTool implements Tool<typeof getIssueParameters> {
  private repo: GitHubRepository

  constructor({ repo }: { repo: GitHubRepository }) {
    this.repo = repo
  }

  parameters = getIssueParameters

  tool = zodFunction({
    name: "get_issue",
    parameters: getIssueParameters,
    description:
      "Retrieves a GitHub issue by its number. Use this when you find references to issues in PR descriptions (e.g., 'Fixes #123' or 'Related to #456').",
  })

  async handler({
    issueNumber,
  }: z.infer<typeof getIssueParameters>): Promise<string> {
    const issue = await getIssue({
      fullName: this.repo.full_name,
      issueNumber,
    })

    return JSON.stringify(issue)
  }
}

export default GetIssueTool
