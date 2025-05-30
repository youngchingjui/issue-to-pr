import getOctokit from "@/lib/github"
import { getGraphQLClient } from "@/lib/github"
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

  const pr = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branch}`,
  })

  if (pr.data.length > 0) {
    return pr.data[0]
  }

  return null
}

export async function createPullRequest({
  repoFullName,
  branch,
  title,
  body,
  issueNumber,
}: {
  repoFullName: string
  branch: string
  title: string
  body: string
  issueNumber?: number
}) {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }

  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  let fullBody = body
  if (issueNumber !== undefined) {
    fullBody += `\n\nCloses #${issueNumber}`
  }

  const pullRequest = await octokit.pulls.create({
    owner,
    repo,
    title,
    body: fullBody,
    head: branch,
    base: "main",
  })

  return pullRequest
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

    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: {
        format: "diff",
      },
    })

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

  const pullRequests = await octokit.rest.pulls.list({
    owner,
    repo,
  })

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

  const commentsResponse = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
  })

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

  const reviewsResponse = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  })

  return reviewsResponse.data
}

/**
 * Fetch all reviews and (inline) review comments for a given Pull Request using GitHub GraphQL API.
 * Returns detailed review objects: each with top-level comment plus their inline/file comments/threads.
 */
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
  const response = await graphqlWithAuth(query, variables)
  // Defensive: Structure the response for easy UI/LLM consumption
  const reviews =
    response?.repository?.pullRequest?.reviews?.nodes?.map((r: any) => ({
      id: r.id,
      author: r.author?.login,
      state: r.state,
      body: r.body,
      submittedAt: r.submittedAt,
      comments: (r.comments?.nodes || []).map((c: any) => ({
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

  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  })

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
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: pullNumber,
    labels,
  })
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

  while (hasNextPage) {
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
  }
  return issuePRStatus
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
  const response = (await graphqlWithAuth(
    query,
    variables
  )) as LinkedIssuesResponse
  const nodes =
    response.repository?.pullRequest?.closingIssuesReferences?.nodes || []
  return nodes.map((n) => n.number)
}
