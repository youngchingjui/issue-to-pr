import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

export async function createBranch(
  repo: string,
  branch: string,
  baseBranch: string = "main"
) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  try {
    // Check if the branch already exists
    await octokit.repos.getBranch({
      owner: user.login,
      repo,
      branch,
    })

    console.error(`Branch '${branch}' already exists.`)
  } catch (error) {
    // If the branch does not exist, proceed to create it
    if (error.status === 404) {
      // Get the latest commit SHA of the base branch
      const { data: baseBranchData } = await octokit.repos.getBranch({
        owner: user.login,
        repo,
        branch: baseBranch,
      })

      // Create a new branch
      await octokit.git.createRef({
        owner: user.login,
        repo,
        ref: `refs/heads/${branch}`,
        sha: baseBranchData.commit.sha,
      })
    } else {
      // Handle other errors that might occur
      console.error(`An error occurred: ${error.message}`)
    }
  }
}
