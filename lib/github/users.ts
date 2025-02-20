import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export async function getGithubUser(): Promise<GitHubUser | null> {
  const octokit = await getOctokit()
  try {
    const user = await octokit.users.getAuthenticated()
    return user.data
  } catch (error: any) {
    if (error.status === 401) { // Unauthorized error, likely due to invalid/expired token
      console.error("Authentication failed: Invalid or expired token.", error)
      // Optionally, attempt to refresh the token or ask for a new one before retrying
      // For now, returning null or re-throw can be a valid approach
      return null
    }
    // Re-throw if it's not an authentication error
    throw error
  }
}
