import { getGithubUser } from "@/lib/github/users"
import {
  GitHubIssue,
  GitHubIssueComment,
  GitHubRepository,
  ListForRepoParams,
} from "@/lib/types"

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
  repo,
  comment,
}: {
  issueNumber: number
  repo: GitHubRepository
  comment: string
}): Promise<GitHubIssueComment> {
  const octokit = await getOctokit()
  const issue = await octokit.rest.issues.createComment({
    owner: repo.owner.login,
    repo: repo.name,
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
  repo,
  ...rest
}: {
  repo: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<GitHubIssue[]> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const issues = await octokit.issues.listForRepo({
    owner: user.login,
    repo,
    ...rest,
  })
  // Filter out pull requests from the list of issues
  return issues.data.filter((issue) => !issue.pull_request)
}
