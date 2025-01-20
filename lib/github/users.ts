import getOctokit from "@/lib/github"
import { GitHubUser } from "@/lib/types"

export async function getGithubUser(): Promise<GitHubUser> {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  return user.data
}
