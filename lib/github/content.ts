import getOctokit from "@/lib/github"
import {
  AuthenticatedUserRepository,
  GitHubRepository,
  RepoFullName,
} from "@/lib/types"

export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

// TODO: Since all octokit functions here are using octokit.repos, then
// This file should be renamed to `repos.tsx` to reflect the resource being called
export async function getFileContent({
  repoFullName,
  path,
  branch,
}: {
  repoFullName: string
  path: string
  branch: string
}) {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      throw new Error("No octokit found")
    }
    const [owner, repo] = repoFullName.split("/")
    if (!owner || !repo) {
      throw new Error("Invalid repository format. Expected 'owner/repo'")
    }
    const file = await octokit.repos.getContent({
      owner,
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
  repoFullName,
  path,
  content,
  commitMessage,
  branch,
}: {
  repoFullName: string
  path: string
  content: string
  commitMessage: string
  branch: string
}) {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const [owner, repo] = repoFullName.split("/")
  const sha = await getFileSha({ repoFullName, path, branch })

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(content).toString("base64"),
    branch,
    ...(sha && { sha }),
  })
}

export async function getFileSha({
  repoFullName,
  path,
  branch,
}: {
  repoFullName: string
  path: string
  branch: string
}): Promise<string | null> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
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
  repoFullName: string,
  branch: string
): Promise<boolean> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  try {
    await octokit.repos.getBranch({
      owner,
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
  fullName: RepoFullName
): Promise<GitHubRepository> {
  // fullName should be in format like `owner/repo`
  const [owner, repo] = fullName.split("/")
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  })
  return repoData
}

export async function getUserRepositories(
  username: string,
  options: {
    type?: "owner" | "all" | "member"
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
  if (!octokit) {
    throw new Error("No octokit found")
  }
  try {
    const response = await octokit.rest.repos.listForUser({
      username,
      ...options,
    })

    const linkHeader = response.headers.link
    const lastPageMatch = linkHeader?.match(
      /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/
    )
    const maxPage = lastPageMatch ? Number(lastPageMatch[1]) : 1
    return {
      repositories: response.data as AuthenticatedUserRepository[],
      maxPage,
    }
  } catch (error) {
    // Handle specific errors from GitHub
    if (error.status === 404) {
      throw new GitHubError(`User not found: ${username}`, 404)
    }
    if (error.status === 403) {
      throw new GitHubError("Authentication failed or rate limit exceeded", 403)
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in getUserRepositories:", error)
    throw new GitHubError(
      `Failed to fetch user repositories: ${error.message}`,
      500
    )
  }
}

export async function getAuthenticatedUserRepositories(
  options: {
    type?: "all" | "owner" | "public" | "private" | "member"
    sort?: "created" | "updated" | "pushed" | "full_name"
    direction?: "asc" | "desc"
    per_page?: number
    page?: number
    affiliation?: string
  } = {}
): Promise<{
  repositories: AuthenticatedUserRepository[]
  maxPage: number
}> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  try {
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      ...options,
    })

    const linkHeader = response.headers.link
    const lastPageMatch = linkHeader?.match(
      /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/
    )
    const maxPage = lastPageMatch ? Number(lastPageMatch[1]) : 1
    return {
      repositories: response.data as AuthenticatedUserRepository[],
      maxPage,
    }
  } catch (error) {
    // Handle specific errors from GitHub
    if (error.status === 404) {
      throw new GitHubError("User not found", 404)
    }
    if (error.status === 403) {
      throw new GitHubError("Authentication failed or rate limit exceeded", 403)
    }

    // Log and throw unexpected errors
    console.error(
      "Unexpected error in getAuthenticatedUserRepositories:",
      error
    )
    throw new GitHubError(
      `Failed to fetch authenticated user repositories: ${error.message}`,
      500
    )
  }
}

export function combineRepositories<T extends { id: number }>(
  repos1: T[],
  repos2: T[]
): T[] {
  // Create a Map to store unique repositories by their ID
  const repoMap = new Map<number, T>()

  // Add all repositories from the first array
  repos1.forEach((repo) => repoMap.set(repo.id, repo))

  // Add all repositories from the second array (will overwrite duplicates)
  repos2.forEach((repo) => repoMap.set(repo.id, repo))

  // Convert the Map values back to an array and sort by id
  return Array.from(repoMap.values()).sort((a, b) => b.id - a.id)
}
