import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"
import { PullRequest, GitHubRepository } from "@/lib/types"

export async function getPullRequestOnBranch({
  repo,
  branch,
}: {
  repo: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()
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
}): Promise<PullRequest[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")

  const pullRequests = await octokit.rest.pulls.list({
    owner,
    repo,
  })

  return pullRequests.data
}

export async function createPullRequestComment({
  pullNumber,
  repo,
  comment,
}: {
  pullNumber: number
  repo: GitHubRepository
  comment: string
}): Promise<any> {
  const octokit = await getOctokit()

  const reviewComment = await octokit.pulls.createReviewComment({
    owner: repo.owner.login,
    repo: repo.name,
    pull_number: pullNumber,
    body: comment,
    commit_id: '', // Specify the commit ID if needed
    path: '', // Specify the file path if needed (optional)
    position: 1, // Position in the file if path is specified (default to line 1)
  })

  return reviewComment.data
}
