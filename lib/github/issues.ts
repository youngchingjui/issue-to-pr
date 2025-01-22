import { getGithubUser } from "@/lib/github/users"
import { Issue } from "@/lib/types"

import getOctokit from "."

export async function getIssue({
  repo,
  issueNumber,
}: {
  repo: string
  issueNumber: number
}): Promise<Issue> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const issue = await octokit.issues.get({
    owner: user.login,
    repo,
    issue_number: issueNumber,
  })
  return issue.data as Issue
}
