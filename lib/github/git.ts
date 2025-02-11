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
    // List all branches and check if the branch already exists
    const { data: branches } = await octokit.repos.listBranches({
      owner: user.login,
      repo,
    });

    const branchExists = branches.some(b => b.name === branch);
    if (branchExists) {
      console.log(`The branch '${branch}' already exists.`);
      return;
    }

    // Get the latest commit SHA of the base branch
    const { data: baseBranchData } = await octokit.repos.getBranch({
      owner: user.login,
      repo,
      branch: baseBranch,
    });

    // Create a new branch
    await octokit.git.createRef({
      owner: user.login,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseBranchData.commit.sha,
    });

    console.log(`Branch '${branch}' created successfully.`);
  } catch (error) {
    if (error.status === 422) {
      console.log(`The branch '${branch}' already exists or there was a validation error.`);
    } else {
      console.error(`An error occurred: ${error.message}`);
    }
  }
}
