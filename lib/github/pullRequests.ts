import { logEnd, logStart, withTiming } from "shared/utils/telemetry"

import getOctokit, { getGraphQLClient } from "@/lib/github"
import {
  IssueComment,
  PullRequest,
  PullRequestList,
  PullRequestReview,
} from "@/lib/types/github"

export async function getPullRequestOnBranch({
  repoFullName,
  branch,
}: {
  repoFullName: string
  branch: string
}) {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  if (!octokit) {
    throw new Error("No octokit found")
  }

  const pr = await withTiming(
    `GitHub REST: pulls.list head=${owner}:${branch}`,
    () =>
      octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branch}`,
      })
  )

  if (pr.data.length > 0) {
    return pr.data[0]
  }

  return null
}

// ------------------------------
// GraphQL types
// ------------------------------
interface RepositoryIdResponse {
  repository: {
    id: string
  }
}

interface CreatePRGraphQLResponse {
  createPullRequest: {
    pullRequest: {
      number: number
      url: string
      title: string
      body: string | null
    }
  }
}

export async function createPullRequest({
  repoFullName,
  branch,
  title,
  body,
  issueNumber,
  baseRefName = "main",
}: {
  repoFullName: string
  branch: string
  title: string
  body: string
  issueNumber?: number
  baseRefName?: string
}) {
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  // 1. Retrieve repository ID (required for mutation input)
  const repoIdQuery = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
      }
    }
  `
  const repoIdResult = await withTiming(
    `GitHub GraphQL: get repository id ${repoFullName}`,
    () =>
      graphqlWithAuth<RepositoryIdResponse>(repoIdQuery, { owner, name: repo })
  )
  const repositoryId = repoIdResult.repository.id

  if (!repositoryId) throw new Error("Failed to retrieve repository ID")

  // 2. Prepare body (append closing keyword if issueNumber provided)
  let fullBody = body
  if (typeof issueNumber === "number") {
    fullBody += `\n\nCloses #${issueNumber}`
  }

  // 3. Execute createPullRequest mutation
  const createPRMutation = `
    mutation ($input: CreatePullRequestInput!) {
      createPullRequest(input: $input) {
        pullRequest {
          number
          url
          title
          body
        }
      }
    }
  `

  const variables = {
    input: {
      repositoryId,
      baseRefName: baseRefName,
      headRefName: branch,
      title,
      body: fullBody,
      draft: false,
    },
  }

  const response = await withTiming(
    `GitHub GraphQL: createPullRequest(base=${baseRefName}) ${repoFullName} ${branch}`,
    () => graphqlWithAuth<CreatePRGraphQLResponse>(createPRMutation, variables)
  )

  const pr = response.createPullRequest.pullRequest

  // 4. Return in a REST-like shape expected by callers (pr.data.*)
  return {
    data: pr,
  }
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
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  const repoIdQuery = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
      }
    }
  `
  const repoIdResult = await withTiming(
    `GitHub GraphQL: get repository id ${repoFullName}`,
    () =>
      graphqlWithAuth<RepositoryIdResponse>(repoIdQuery, { owner, name: repo })
  )
  const repositoryId = repoIdResult.repository.id
  if (!repositoryId) throw new Error("Failed to retrieve repository ID")

  const createPRMutation = `
    mutation ($input: CreatePullRequestInput!) {
      createPullRequest(input: $input) {
        pullRequest {
          number
          url
          title
          body
        }
      }
    }
  `

  const variables = {
    input: {
      repositoryId,
      baseRefName: base,
      headRefName: branch,
      title,
      body,
      draft: false,
    },
  }

  const response = await withTiming(
    `GitHub GraphQL: createPullRequest(base=${base}) ${repoFullName} ${branch}`,
    () => graphqlWithAuth<CreatePRGraphQLResponse>(createPRMutation, variables)
  )

  const pr = response.createPullRequest.pullRequest
  return { data: pr }
}

export async function getPullRequestDiff({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<string> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      throw new Error("No octokit found")
    }

    const [owner, repo] = repoFullName.split("/")

    const response = await withTiming(
      `GitHub REST: pulls.get(diff) ${repoFullName}#${pullNumber}`,
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

    // Check if response.data is a string
    if (typeof response.data !== "string") {
      throw new Error("Unexpected response type")
    }

    const diff: string = response.data

    return diff
  } catch (error) {
    console.error("Failed to fetch pull request diff:", error)
    throw new Error("Could not retrieve pull request diff")
  }
}

export async function getPullRequestList({
  repoFullName,
}: {
  repoFullName: string
}): Promise<PullRequestList> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }

  const [owner, repo] = repoFullName.split("/")

  const pullRequests = await withTiming(
    `GitHub REST: pulls.list ${repoFullName}`,
    () =>
      octokit.rest.pulls.list({
        owner,
        repo,
      })
  )

  return pullRequests.data
}

export async function getPullRequestComments({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<IssueComment[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")

  if (!octokit) {
    throw new Error("No octokit found")
  }

  const commentsResponse = await withTiming(
    `GitHub REST: issues.listComments PR ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
      })
  )

  return commentsResponse.data
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

// Interface for the GraphQL response for PR reviews and comments
interface PullRequestReviewCommentsGraphQLResponse {
  repository: {
    pullRequest: {
      reviews: {
        nodes: Array<{
          id: string
          author: { login: string } | null
          state: string
          body: string
          submittedAt: string
          comments: {
            nodes: Array<{
              id: string
              author: { login: string } | null
              body: string
              path: string
              position: number | null
              originalPosition: number | null
              diffHunk: string
              createdAt: string
              replyTo: { id: string } | null
              pullRequestReview: { id: string } | null
            }>
          }
        }>
      }
    }
  }
}

export async function getPullRequestReviewCommentsGraphQL({
  repoFullName,
  pullNumber,
  reviewsLimit = 50,
  commentsPerReview = 50,
}: {
  repoFullName: string
  pullNumber: number
  reviewsLimit?: number
  commentsPerReview?: number
}) {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")
  // GraphQL query for reviews and review comments
  const query = `
    query($owner: String!, $repo: String!, $pullNumber: Int!, $reviewsLimit: Int!, $commentsPerReview: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pullNumber) {
          reviews(first: $reviewsLimit) {
            nodes {
              id
              author { login }
              state
              body
              submittedAt
              comments(first: $commentsPerReview) {
                nodes {
                  id
                  author { login }
                  body
                  path
                  position
                  originalPosition
                  diffHunk
                  createdAt
                  replyTo { id }
                  pullRequestReview { id }
                }
              }
            }
          }
        }
      }
    }
  `
  const variables = {
    owner,
    repo,
    pullNumber,
    reviewsLimit,
    commentsPerReview,
  }
  const response = await withTiming(
    `GitHub GraphQL: reviews+comments ${repoFullName}#${pullNumber}`,
    () =>
      graphqlWithAuth<PullRequestReviewCommentsGraphQLResponse>(
        query,
        variables
      )
  )
  // Defensive: Structure the response for easy UI/LLM consumption
  const reviews =
    response?.repository?.pullRequest?.reviews?.nodes?.map((r) => ({
      id: r.id,
      author: r.author?.login,
      state: r.state,
      body: r.body,
      submittedAt: r.submittedAt,
      comments: (r.comments?.nodes || []).map((c) => ({
        id: c.id,
        author: c.author?.login,
        body: c.body,
        file: c.path,
        position: c.position,
        originalPosition: c.originalPosition,
        diffHunk: c.diffHunk,
        createdAt: c.createdAt,
        replyTo: c.replyTo?.id,
        reviewId: c.pullRequestReview?.id,
      })),
    })) || []
  return reviews
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

  return response.data
}

export async function addLabelsToPullRequest({
  repoFullName,
  pullNumber,
  labels,
}: {
  repoFullName: string
  pullNumber: number
  labels: string[]
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
    `GitHub REST: issues.addLabels ${repoFullName}#${pullNumber}`,
    () =>
      octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels,
      })
  )
}

// Minimal type for the GraphQL response
interface PRLinkedIssuesGraphQLResponse {
  repository: {
    pullRequests: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      nodes: Array<{
        number: number
        closingIssuesReferences: {
          nodes: Array<{ number: number }>
        }
      }>
    }
  }
}

export async function getPRLinkedIssuesMap(
  repoFullName: string
): Promise<Record<number, boolean>> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  let hasNextPage = true
  let endCursor: string | null = null
  const issuePRStatus: Record<number, boolean> = {}

  const totalStart = logStart(
    `GitHub GraphQL: getPRLinkedIssuesMap ${repoFullName}`
  )
  while (hasNextPage) {
    const pageStart = logStart(
      `GitHub GraphQL page getPRLinkedIssuesMap ${repoFullName}`,
      { after: endCursor }
    )
    const query = `
      query($owner: String!, $repo: String!, $after: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 50, after: $after, states: [OPEN, MERGED, CLOSED]) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              number
              closingIssuesReferences(first: 10) {
                nodes {
                  number
                }
              }
            }
          }
        }
      }
    `
    const variables = { owner, repo, after: endCursor }
    const response = (await graphqlWithAuth(
      query,
      variables
    )) as PRLinkedIssuesGraphQLResponse
    const prNodes = response.repository.pullRequests.nodes
    for (const pr of prNodes) {
      for (const issue of pr.closingIssuesReferences.nodes) {
        issuePRStatus[issue.number] = true
      }
    }
    hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage
    endCursor = response.repository.pullRequests.pageInfo.endCursor
    logEnd(
      `GitHub GraphQL page getPRLinkedIssuesMap ${repoFullName}`,
      pageStart,
      {
        after: variables.after,
        nextAfter: endCursor,
      }
    )
  }
  logEnd(`GitHub GraphQL: getPRLinkedIssuesMap ${repoFullName}`, totalStart)
  return issuePRStatus
}

export async function getIssueToPullRequestMap(
  repoFullName: string
): Promise<Record<number, number>> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  let hasNextPage = true
  let endCursor: string | null = null
  const issuePRMap: Record<number, number> = {}

  const totalStart = logStart(
    `GitHub GraphQL: getIssueToPullRequestMap ${repoFullName}`
  )
  while (hasNextPage) {
    const pageStart = logStart(
      `GitHub GraphQL page getIssueToPullRequestMap ${repoFullName}`,
      { after: endCursor }
    )
    const query = `
      query($owner: String!, $repo: String!, $after: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 50, after: $after, states: [OPEN, MERGED, CLOSED]) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              number
              closingIssuesReferences(first: 10) {
                nodes {
                  number
                }
              }
            }
          }
        }
      }
    `
    const variables = { owner, repo, after: endCursor }
    const response = (await graphqlWithAuth(
      query,
      variables
    )) as PRLinkedIssuesGraphQLResponse
    const prNodes = response.repository.pullRequests.nodes
    for (const pr of prNodes) {
      for (const issue of pr.closingIssuesReferences.nodes) {
        if (!issuePRMap[issue.number]) {
          issuePRMap[issue.number] = pr.number
        }
      }
    }
    hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage
    endCursor = response.repository.pullRequests.pageInfo.endCursor
    logEnd(
      `GitHub GraphQL page getIssueToPullRequestMap ${repoFullName}`,
      pageStart,
      { after: variables.after, nextAfter: endCursor }
    )
  }
  logEnd(`GitHub GraphQL: getIssueToPullRequestMap ${repoFullName}`, totalStart)
  return issuePRMap
}

/**
 * Returns the list of issue numbers that are linked (via closing keywords) to a given pull request.
 */
export async function getLinkedIssuesForPR({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<number[]> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  const query = `
    query($owner: String!, $repo: String!, $pullNumber: Int!) {
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
  `
  const variables = { owner, repo, pullNumber }
  interface LinkedIssuesResponse {
    repository: {
      pullRequest: {
        closingIssuesReferences: {
          nodes: Array<{ number: number }>
        }
      } | null
    } | null
  }
  const response = (await withTiming(
    `GitHub GraphQL: getLinkedIssuesForPR ${repoFullName}#${pullNumber}`,
    () => graphqlWithAuth(query, variables)
  )) as LinkedIssuesResponse
  const nodes =
    response.repository?.pullRequest?.closingIssuesReferences?.nodes || []
  return nodes.map((n) => n.number)
}

// ------------------------------
// Preview link discovery (heuristic)
// ------------------------------
function extractUrls(text?: string | null): string[] {
  if (!text) return []
  const regex = /https?:\/\/[^\s)]+/g
  const matches = text.match(regex)
  return matches ? matches : []
}

const PREVIEW_HINTS = [
  "preview",
  "vercel.app",
  "netlify.app",
  "cloudflarepages.com",
  "onrender.com",
  "fly.dev",
]

export async function findPreviewUrlForPR({
  repoFullName,
  pr,
}: {
  repoFullName: string
  pr: PullRequest
}): Promise<string | null> {
  // 1. Check PR body for likely preview URLs
  const bodyProp = (pr as Partial<{ body: string | null }>).body
  const bodyUrls = extractUrls(bodyProp)
  const bodyHit = bodyUrls.find((u) =>
    PREVIEW_HINTS.some((hint) => u.toLowerCase().includes(hint))
  )
  if (bodyHit) return bodyHit

  // 2. Fallback: scan comments for preview-like URLs
  try {
    const comments = await getPullRequestComments({
      repoFullName,
      pullNumber: pr.number,
    })
    for (const c of comments) {
      const urls = extractUrls(c.body)
      const hit = urls.find((u) =>
        PREVIEW_HINTS.some((hint) => u.toLowerCase().includes(hint))
      )
      if (hit) return hit
    }
  } catch {
    // ignore and fallback
    console.warn("findPreviewUrlForPR: failed to scan comments")
  }

  // 3. Last resort: return the first non-GitHub URL found in body
  const nonGitHub = bodyUrls.find((u) => !u.includes("github.com"))
  return nonGitHub ?? null
}

export type PullRequestExtras = {
  previewUrl: string | null
  linkedIssues: number[]
}

export async function getPullRequestListWithExtras({
  repoFullName,
}: {
  repoFullName: string
}): Promise<Array<{ pr: PullRequest; extras: PullRequestExtras }>> {
  const list = await getPullRequestList({ repoFullName })

  const enriched = await Promise.all(
    list.map(async (pr) => {
      const [previewUrl, linkedIssues] = await Promise.all([
        findPreviewUrlForPR({ repoFullName, pr }),
        getLinkedIssuesForPR({ repoFullName, pullNumber: pr.number }),
      ])
      return { pr, extras: { previewUrl, linkedIssues } }
    })
  )

  return enriched
}

