import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

export enum BranchCreationStatus {
  Success,
  BranchAlreadyExists,
  NetworkError,
  Unauthorized,
  UnknownError,
}

type BranchCreationResult = {
  status: BranchCreationStatus
  message: string
}

export async function createBranch(
  repo: string,
  branch: string,
  baseBranch: string = "main"
): Promise<BranchCreationResult> {
  const octokit = await getOctokit()
  const user = await getGithubUser()

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

    return {
      status: BranchCreationStatus.Success,
      message: `Branch '${branch}' created successfully.`,
    }
  } catch (error) {
    if (
      error.status === 422 &&
      error.response.data.message === "Reference already exists"
    ) {
      return {
        status: BranchCreationStatus.BranchAlreadyExists,
        message: `Branch '${branch}' already exists.`,
      }
    } else if (error.status === 401) {
      return {
        status: BranchCreationStatus.Unauthorized,
        message: "Unauthorized access. Please check your credentials.",
      }
    } else if (error.code === "ENOTFOUND") {
      return {
        status: BranchCreationStatus.NetworkError,
        message: "Network error. Please check your connection.",
      }
    } else {
      return {
        status: BranchCreationStatus.UnknownError,
        message: "An unknown error occurred.",
      }
    }
  }
}
