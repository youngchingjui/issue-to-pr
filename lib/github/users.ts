import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types/github"

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      console.log("No Octokit instance found")
      return null
    }

    const { data: user } = await octokit.users.getAuthenticated()
    return user
  } catch (_) {
    return null
  }
}
