import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      console.log("No Octokit instance found")
      return null
    }

    const { data: user } = await octokit.users.getAuthenticated()
    return user
  } catch (error) {
    // Log the error but don't expose it to the caller
    console.error("Failed to fetch GitHub user:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return null
  }
}
