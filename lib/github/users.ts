import getOctokit from "."

export async function getGithubUser() {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  return user
}
