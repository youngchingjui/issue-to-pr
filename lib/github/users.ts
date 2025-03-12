import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export type GitHubAuthResult = {
  user: GitHubUser | null
  error?: {
    code: string
    message: string
    status?: number
  }
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GitHubAuthError"
  }
}

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const result = await getGithubUserWithError()
    return result.user
  } catch (error) {
    // Catch any unexpected errors to ensure we always return null
    console.error("Unexpected error in getGithubUser:", error)
    return null
  }
}

export async function getGithubUserWithError(): Promise<GitHubAuthResult> {
  const octokit = await getOctokit()
  if (!octokit) {
    console.log("No Octokit instance found")
    return {
      user: null,
      error: {
        code: "NO_AUTH",
        message: "Authentication required",
      },
    }
  }

  try {
    const user = await octokit.users.getAuthenticated()
    return { user: user.data }
  } catch (error) {
    console.error("Failed to get authenticated user:", error)

    if (error.status === 401) {
      return {
        user: null,
        error: {
          code: "AUTH_FAILED",
          message: "Authentication failed",
          status: 401,
        },
      }
    }

    return {
      user: null,
      error: {
        code: "UNKNOWN_ERROR",
        message: error.message || "Unknown error occurred",
        status: error.status,
      },
    }
  }
}
