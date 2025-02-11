import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

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
}: {
  repo: string
  branch: string
  title: string
  body: string
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  const pullRequest = await octokit.pulls.create({
    owner: user.login,
    repo,
    title,
    body,
    head: branch,
    base: "main",
  })

  return pullRequest
}

export async function getPullRequestDiff({
  repo,
  pullNumber,
}: {
  repo: string
  pullNumber: number
}): Promise<string> {
  try {
    const octokit = await getOctokit()
    const user = await getGithubUser()

    const response = await octokit.pulls.get({
      owner: user.login,
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
