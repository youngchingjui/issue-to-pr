import { getGithubUser } from "@/lib/github/users"
import { GitHubIssue, GitHubIssueComment, ListForRepoParams } from "@/lib/types"

import getOctokit from "."

export async function getIssue({
  fullName,
  issueNumber,
}: {
  fullName: string
  issueNumber: number
}): Promise<GitHubIssue> {
  const octokit = await getOctokit()
  const [owner, repo] = fullName.split("/")
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  })
  return issue.data
}

export async function createIssueComment({
  issueNumber,
  repoFullName,
  comment,
}: {
  issueNumber: number
  repoFullName: string
  comment: string
}): Promise<GitHubIssueComment> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  const issue = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: comment,
  })
  return issue.data
}

export async function getIssueComments({
  repo,
  issueNumber,
}: {
  repo: string
  issueNumber: number
}): Promise<GitHubIssueComment[]> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const comments = await octokit.issues.listComments({
    owner: user.login,
    repo,
    issue_number: issueNumber,
  })
  return comments.data as GitHubIssueComment[]
}

export async function getIssueList({
  repoFullName,
  ...rest
}: {
  repoFullName: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<GitHubIssue[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  const issues = await octokit.issues.listForRepo({
    owner,
    repo,
    ...rest,
  })
  // Filter out pull requests from the list of issues
  return issues.data.filter((issue) => !issue.pull_request)
}
