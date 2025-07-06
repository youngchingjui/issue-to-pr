"use server"

import getOctokit from "@/lib/github"
import { getPRLinkedIssuesMap } from "@/lib/github/pullRequests"
import { getPlanStatusForIssues } from "@/lib/neo4j/services/plan"
import {
  GitHubIssue,
  GitHubIssueComment,
  ListForRepoParams,
  RepoFullName,
  GetIssueResult,
} from "@/lib/types/github"

export async function createIssue({
  repoFullName,
  title,
  body,
}: {
  repoFullName: RepoFullName
  title: string
  body: string
}) {
  const octokit = await getOctokit()
  const { owner, repo } = repoFullName
  if (!octokit) throw new Error("No octokit found")
  return await octokit.rest.issues.create({ owner, repo, title, body })
}

// Updated: fetch single issue from GitHub with structured error result
export async function getIssue({
  fullName,
  issueNumber,
}: {
  fullName: string
  issueNumber: number
}): Promise<GetIssueResult> {
  const octokit = await getOctokit()
  if (!octokit) {
    return { type: "other_error", error: "No octokit found" }
  }
  const [owner, repo] = fullName.split("/")
  if (!owner || !repo) {
    return { type: "not_found" }
  }
  try {
    const issue = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })
    return { type: "success", issue: issue.data }
  } catch (error: any) {
    if (error?.status === 404) {
      return { type: "not_found" }
    }
    if (error?.status === 403) {
      return { type: "forbidden" }
    }
    return { type: "other_error", error }
  }
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
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const issue = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: comment,
  })
  return issue.data
}

export async function getIssueComments({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<GitHubIssueComment[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected '\''owner/repo'\''")
  }
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const comments = await octokit.rest.issues.listComments({
    owner,
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

  if (!octokit) {
    throw new Error("No octokit found")
  }

  const issues = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    ...rest,
  })
  // Filter out pull requests from the list of issues
  return issues.data.filter((issue) => !issue.pull_request)
}

export async function updateIssueComment({
  commentId,
  repoFullName,
  comment,
}: {
  commentId: number
  repoFullName: string
  comment: string
}): Promise<GitHubIssueComment> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  try {
    const updatedComment = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: comment,
    })
    return updatedComment.data
  } catch (error) {
    console.error(`Failed to update comment: ${commentId}`, error)
    throw error
  }
}

/**
 * Aggregates GitHub issues with Neo4j plan and PR status
 */
export type IssueWithStatus = GitHubIssue & {
  hasPlan: boolean
  hasPR: boolean
}

/**
 * For a repo, get list of issues with hasPlan and hasPR badges.
 */
export async function getIssueListWithStatus({
  repoFullName,
  ...rest
}: {
  repoFullName: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<IssueWithStatus[]> {
  // 1. Get issues from GitHub
  const issues = await getIssueList({ repoFullName, ...rest })

  // 2. Query Neo4j for plans using the service layer
  const issueNumbers = issues.map((issue) => issue.number)
  const issuePlanStatus = await getPlanStatusForIssues({
    repoFullName,
    issueNumbers,
  })

  // 3. Get PRs from GitHub using GraphQL, and find for each issue if it has a PR referencing it.
  const issuePRStatus = await getPRLinkedIssuesMap(repoFullName)

  // 4. Compose the final list
  const withStatus: IssueWithStatus[] = issues.map((issue) => ({
    ...issue,
    hasPlan: issuePlanStatus[issue.number] || false,
    hasPR: issuePRStatus[issue.number] || false,
  }))

  return withStatus
}
