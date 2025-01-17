import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

export async function createBranch(
  repo: string,
  branch: string,
  baseBranch: string = "main"
) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  // Get the latest commit SHA of the base branch
  const { data: baseBranchData } = await octokit.repos.getBranch({
    owner: user.data.login,
    repo,
    branch: baseBranch,
  })

  // Create a new branch
  await octokit.git.createRef({
    owner: user.data.login,
    repo,
    ref: `refs/heads/${branch}`,
    sha: baseBranchData.commit.sha,
  })
}
