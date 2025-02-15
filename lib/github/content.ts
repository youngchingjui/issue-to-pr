import getOctokit from "@/lib/github"
import { GitHubError } from "@/lib/github-old"
import { AuthenticatedUserRepository, GitHubRepository } from "@/lib/types"

import { getGithubUser } from "./users"

// TODO: Since all octokit functions here are using octokit.repos, then
// This file should be renamed to `repos.tsx` to reflect the resource being called
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
    const user = await getGithubUser()
    const file = await octokit.repos.getContent({
      owner: user.login,
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
  const user = await getGithubUser()
  const sha = await getFileSha({ repo, path, branch })
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: user.login,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(content).toString("base64"),
    branch,
    ...(sha && { sha }),
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
}): Promise<string | null> {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  try {
    const response = await octokit.rest.repos.getContent({
      owner: user.login,
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
  } catch (error) {
    if (error.status === 404) {
      console.debug(`[DEBUG] File ${path} not found on branch ${branch}`)
      return null
    }
    throw error
  }

  throw new Error("Could not get file SHA")
}

export async function checkBranchExists(
  repo: string,
  branch: string
): Promise<boolean> {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  try {
    await octokit.repos.getBranch({
      owner: user.login,
      repo,
      branch,
    })
    return true
  } catch (error) {
    if (error.status === 404) {
      return false
    }
    throw error
  }
}

export async function getRepoFromString(
  fullName: string
): Promise<GitHubRepository> {
  // fullName should be in format like `owner/repo`
  const [owner, repo] = fullName.split("/")
  const octokit = await getOctokit()
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  })
  return repoData
}

export async function getUserRepositories(
  username: string,
  options: {
    type?: "owner" | "all" | "public" | "private" | "member"
    sort?: "created" | "updated" | "pushed" | "full_name"
    direction?: "asc" | "desc"
    per_page?: number
    page?: number
  } = {}
): Promise<{
  repositories: AuthenticatedUserRepository[]
  maxPage: number
}> {
  const octokit = await getOctokit()

  const response = await octokit.repos.listForAuthenticatedUser({
    username,
    ...options,
  })

  const linkHeader = response.headers.link
  const lastPageMatch = linkHeader?.match(
    /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/
  )
  const maxPage = lastPageMatch ? Number(lastPageMatch[1]) : 1
  return { repositories: response.data, maxPage }
}
