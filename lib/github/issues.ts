import { getGithubUser } from "@/lib/github/users"
import { GitHubIssueComment, GitHubRepository, Issue } from "@/lib/types"

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
}): Promise<{author: string, body: string}[]> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const commentsResponse = await octokit.issues.listComments({
    owner: user.login,
    repo,
    issue_number: issueNumber,
  })
  
  return commentsResponse.data.map(comment => ({
    author: comment.user.login,
    body: comment.body
  }))
}