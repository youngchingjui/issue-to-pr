import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

export async function createBranch(
  repo: string,
  branch: string,
  baseBranch: string = "main"
) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  // Check if the branch already exists
  const { data: branches } = await octokit.repos.listBranches({
    owner: user.login,
    repo,
  })
  const branchExists = branches.some(({ name }) => name === branch)

  if (branchExists) {
    console.log(`Branch '${branch}' already exists.`)
    return `Branch '${branch}' already exists.`
  }

  try {
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

    console.log(`Branch '${branch}' created successfully.`)
    return `Branch '${branch}' created successfully.`
  } catch (error) {
    console.error(`Failed to create branch '${branch}':`, error)
    return `Failed to create branch '${branch}': ${error.message}`
  }
}
