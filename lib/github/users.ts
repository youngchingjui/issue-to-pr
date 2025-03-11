import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export async function getGithubUser(): Promise<GitHubUser | null> {
  const octokit = await getOctokit()
  if (!octokit) {
    console.log("No Octokit instance found")
    return null
  }
  try {
    const user = await octokit.users.getAuthenticated()
    return user.data
  } catch (error) {
    console.error("Failed to get authenticated user:", error)
    return null
  }
}
