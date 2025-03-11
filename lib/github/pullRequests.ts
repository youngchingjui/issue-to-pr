import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"
import {
  IssueComment,
  PullRequest,
  PullRequestList,
  PullRequestReview,
} from "@/lib/types"

export async function getPullRequestOnBranch({
  repo,
  branch,
}: {
  repo: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  if (!user) {
    throw new Error("Failed to get authenticated user")
  }
  const userName = user.login
  const pr = await octokit.pulls.list({
    owner: userName,
    repo,
    head: `${userName}:${branch}`,
  })

  if (pr.data.length > 0) {
    return pr.data[0]
  }

  return null
}

export async function createPullRequest({
  repo,
  branch,
  title,
  body,
  issueNumber,
}: {
  repo: string
  branch: string
  title: string
  body: string
  issueNumber?: number
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  if (!user) {
    throw new Error("Failed to get authenticated user")
  }

  let fullBody = body
  if (issueNumber !== undefined) {
    fullBody += `\n\nCloses #${issueNumber}`
  }

  const pullRequest = await octokit.pulls.create({
    owner: user.login,
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

  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  })

  return response.data
}
