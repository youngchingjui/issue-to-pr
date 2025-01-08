import getOctokit from "@/lib/github"

import { GitHubError } from "../github-old"

export async function getFileContent({
  repo,
  path,
  branch,
}: {
  repo: string
  path: string
  branch: string
}) {
  try {
    const octokit = await getOctokit()
    const user = await octokit.users.getAuthenticated()
    const file = await octokit.repos.getContent({
      owner: user.data.login,
      repo,
      path,
      ref: branch,
    })
    return file.data
  } catch (error) {
    // Handle specific GitHub API errors
    if (error.status === 404) {
      throw new GitHubError(`File not found: ${path}`, 404)
    }
    if (error.status === 403) {
      throw new GitHubError("Authentication failed or rate limit exceeded", 403)
    }

    // Log unexpected errors
    console.error("Unexpected error in getFileContent:", error)
    throw new GitHubError(`Failed to fetch file content: ${error.message}`, 500)
  }
}

export async function updateFileContent({
  repo,
  path,
  content,
  commitMessage,
  branch,
}: {
  repo: string
  path: string
  content: string
  commitMessage: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  const sha = await getFileSha({ repo, path, branch })
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: user.data.login,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(content).toString("base64"),
    sha,
    branch,
  })
}

export async function getFileSha({
  repo,
  path,
  branch,
}: {
  repo: string
  path: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  const response = await octokit.rest.repos.getContent({
    owner: user.data.login,
    repo,
    path,
    ref: branch,
  })

  if (Array.isArray(response.data)) {
    throw new Error("Path points to a directory, not a file")
  }

  if ("sha" in response.data) {
    return response.data.sha
  }

  throw new Error("Could not get file SHA")
}