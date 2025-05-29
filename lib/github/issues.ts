import getOctokit from "@/lib/github"
import {
  GitHubIssue,
  GitHubIssueComment,
  ListForRepoParams,
} from "@/lib/types/github"
import { n4j } from "@/lib/neo4j/client"
import { listPlansForIssue } from "@/lib/neo4j/repositories/plan"
import { getPullRequestList } from "@/lib/github/pullRequests"

// Existing: fetch single issue from GitHub
export async function getIssue({
  fullName,
  issueNumber,
}: {
  fullName: string
  issueNumber: number
}): Promise<GitHubIssue> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
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
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const comments = await octokit.issues.listComments({
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

  const issues = await octokit.issues.listForRepo({
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

  // 2. Query Neo4j for plans. Do this in a batch for all issues.
  // We'll use a single transaction and a Cypher query matching all issues for given repo and a set of numbers.
  const issueNumbers = issues.map((issue) => issue.number)
  const issuePlanStatus: Record<number, boolean> = {}

  if (issueNumbers.length > 0) {
    const session = await n4j.getSession()
    try {
      const cypher = `
        MATCH (i:Issue)
        WHERE i.repoFullName = $repoFullName AND i.number IN $issueNumbers
        OPTIONAL MATCH (p:Plan)-[:IMPLEMENTS]->(i)
        RETURN i.number AS number, count(p) > 0 AS hasPlan
      `
      const result = await session.run(cypher, {
        repoFullName,
        issueNumbers,
      })
      for (const record of result.records) {
        issuePlanStatus[record.get("number")] = record.get("hasPlan")
      }
    } finally {
      await session.close()
    }
  }

  // 3. Get PRs from GitHub, and find for each issue if it has a PR referencing it.
  // Convention: look for "Closes #<issueNumber>" or "Fixes #<issueNumber>" in PR body.
  const pullRequests = await getPullRequestList({ repoFullName })
  const issuePRStatus: Record<number, boolean> = {}

  for (const issue of issues) {
    issuePRStatus[issue.number] = false
  }

  for (const pr of pullRequests) {
    const prBody = pr.body || ""
    for (const issue of issues) {
      const issueNumber = issue.number
      // Match patterns: Closes #123 (case-insensitive)
      const pattern = new RegExp(
        `(Closes|Fixes|Resolves) #${issueNumber}(?=\b|\D)`,
        "i"
      )
      if (pattern.test(prBody)) {
        issuePRStatus[issueNumber] = true
      }
    }
  }

  // 4. Compose the final list
  const withStatus: IssueWithStatus[] = issues.map((issue) => ({
    ...issue,
    hasPlan: issuePlanStatus[issue.number] || false,
    hasPR: issuePRStatus[issue.number] || false,
  }))

  return withStatus
}
