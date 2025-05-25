import getOctokit from "@/lib/github"
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
  addAIGeneratedLabel = false,
}: {
  repoFullName: string
  branch: string
  title: string
  body: string
  issueNumber?: number
  addAIGeneratedLabel?: boolean
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

  // Optionally add the AI generated label
  if (addAIGeneratedLabel && pullRequest?.data?.number) {
    try {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pullRequest.data.number,
        labels: ["AI generated"],
      })
    } catch (e) {
      // not fatal to PR; log error
      // eslint-disable-next-line no-console
      console.error(
        `Failed to add \"AI generated\" label to PR #${pullRequest.data.number}:`,
        e
      )
    }
  }

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
