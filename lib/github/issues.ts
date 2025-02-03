import { getGithubUser } from "@/lib/github/users"
import {
  GitHubIssue,
  GitHubIssueComment,
  GitHubRepository,
  ListForRepoParams,
} from "@/lib/types"

import getOctokit from "."

export async function getIssue({
  repo,
  issueNumber,
}: {
  repo: string
  issueNumber: number
}): Promise<GitHubIssue> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const issue = await octokit.issues.get({
    owner: user.login,
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
  const user = await getGithubUser()
  const issue = await octokit.issues.createComment({
    owner: user.login,
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
  return issues.data
}
