import getOctokit from "@/lib/github"

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
  repositoryFullName: string,
  branch: string,
  baseBranch: string = "main"
): Promise<BranchCreationResult> {
  const octokit = await getOctokit()
  
  const [owner, repo] = repositoryFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository full name format. Expected 'owner/repo'.")
  }

  try {
    // Get the latest commit SHA of the base branch
    const { data: baseBranchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: baseBranch,
    })

    // Create a new branch
    await octokit.git.createRef({
      owner,
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
