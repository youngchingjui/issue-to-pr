import { getOctokit } from "@/lib/github"
import { withTiming } from "@/shared/src/utils/telemetry"

import {
  GitHubRepository,
  PullRequest,
  PullRequestList,
  PullRequestReview,
  PullRequestReviewComment,
} from "@/lib/types/github"

export async function getPullRequestOnBranch({
  repoFullName,
  branch,
}: {
  repoFullName: string
  branch: string
}): Promise<PullRequest | null> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub REST: pulls.list ${repoFullName}#head:${branch}`,
    () =>
      octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branch}`,
        state: "open",
        per_page: 100,
      })
  )
  const prs = response.data as PullRequestList
  return prs.find((p) => p.head.ref === branch) || null
}

export async function createPullRequestToBase({
  repoFullName,
  branch,
  base,
  title,
  body,
}: {
  repoFullName: string
  branch: string
  base: string
  title: string
  body: string
}) {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  return withTiming(`GitHub REST: pulls.create ${repoFullName}`, () =>
    octokit.rest.pulls.create({
      owner,
      repo,
      head: branch,
      base,
      title,
      body,
    })
  )
}

export async function addLabelsToPullRequest({
  repoFullName,
  pullNumber,
  labels,
}: {
  repoFullName: string
  pullNumber: number
  labels: readonly string[]
}): Promise<void> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  await withTiming(
    `GitHub REST: issues.addLabels ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels: [...labels],
      })
  )
}

export async function getPullRequest({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<PullRequest> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub REST: pulls.get ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      })
  )
  return response.data as PullRequest
}

export async function getPullRequestDiff({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<string> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub REST: pulls.get (diff) ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: {
          format: "diff",
        },
      })
  )
  return String(response.data)
}

export async function getPullRequestComments({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}) {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub REST: issues.listComments ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
      })
  )
  return response.data
}

export async function getPullRequestReviews({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<PullRequestReview[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const reviewsResponse = await withTiming(
    `GitHub REST: pulls.listReviews ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
      })
  )
  return reviewsResponse.data
}

export async function getPullRequestReviewComments({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<PullRequestReviewComment[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub REST: pulls.listReviewComments ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
      })
  )
  return response.data
}

// Interface for the GraphQL response for PR reviews and comments
interface PullRequestReviewCommentsGraphQLResponse {
  repository: {
    pullRequest: {
      reviews: {
        nodes: Array<{
          author: { login: string }
          submittedAt: string
          state: string
          bodyText?: string
        }>
      }
      reviewThreads: {
        nodes: Array<{
          isResolved: boolean
          comments: {
            nodes: Array<{
              author: { login: string }
              bodyText: string
              path: string
              diffHunk: string
              createdAt: string
            }>
          }
        }>
      }
    } | null
  } | null
}

export async function getPullRequestReviewCommentsGraphQL({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}) {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await withTiming(
    `GitHub GraphQL: PullRequest reviews/comments ${repoFullName}#${pullNumber}`,
    () =>
      octokit.graphql<PullRequestReviewCommentsGraphQLResponse>(
        `
      query ($owner: String!, $repo: String!, $pullNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            reviews(first: 50) {
              nodes {
                author { login }
                submittedAt
                state
                bodyText
              }
            }
            reviewThreads(first: 50) {
              nodes {
                isResolved
                comments(first: 50) {
                  nodes {
                    author { login }
                    bodyText
                    path
                    diffHunk
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
      `,
        {
          owner,
          repo,
          pullNumber,
        }
      )
  )

  const pr = response.repository?.pullRequest
  if (!pr) return []

  const reviews = pr.reviews?.nodes || []
  const threads = pr.reviewThreads?.nodes || []

  return [
    ...reviews.map((r) => ({
      type: "review",
      author: r.author.login,
      submittedAt: r.submittedAt,
      state: r.state,
      body: r.bodyText || "",
    })),
    ...threads.map((t) => ({
      type: "thread",
      isResolved: t.isResolved,
      comments: t.comments.nodes.map((c) => ({
        author: c.author.login,
        body: c.bodyText,
        file: c.path,
        diffHunk: c.diffHunk,
        createdAt: c.createdAt,
      })),
    })),
  ]
}

export async function getLinkedIssuesForPR({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<number[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }

  const response = await withTiming(
    `GitHub GraphQL: Linked issues for PR ${repoFullName}#${pullNumber}`,
    () =>
      octokit.graphql<{
        repository: {
          pullRequest: {
            closingIssuesReferences: { nodes: Array<{ number: number }> }
          }
        }
      }>(
        `
      query ($owner: String!, $repo: String!, $pullNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            closingIssuesReferences(first: 10) {
              nodes {
                number
              }
            }
          }
        }
      }
      `,
        {
          owner,
          repo,
          pullNumber,
        }
      )
  )

  const nodes =
    response.repository?.pullRequest?.closingIssuesReferences?.nodes || []
  return nodes.map((n) => n.number)
}

export async function updatePullRequestBody({
  repoFullName,
  pullNumber,
  body,
}: {
  repoFullName: string
  pullNumber: number
  body: string
}): Promise<void> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  await withTiming(
    `GitHub REST: pulls.update(body) ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: pullNumber,
        body,
      })
  )
}

