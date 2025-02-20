import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export async function getGithubUser(): Promise<GitHubUser> {
  const octokit = await getOctokit()
  if (!octokit) {
    console.log("No Octokit instance found")
    return null
  }
  const user = await octokit.users.getAuthenticated()
  return user.data
}
