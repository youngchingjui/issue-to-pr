import getOctokit from "@/shared/lib/github"

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
  fullRepo: string,
  branch: string,
  baseBranch: string = "main"
): Promise<BranchCreationResult> {
  const octokit = await getOctokit()
  const [owner, repo] = fullRepo.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  if (!octokit) {
    throw new Error("No octokit found")
  }

  try {
    // Get the latest commit SHA of the base branch
    const { data: baseBranchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: baseBranch,
    })

    // Create a new branch
    await octokit.rest.git.createRef({
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
    if (!error) {
      return {
        status: BranchCreationStatus.UnknownError,
        message: "An unknown error occurred.",
      }
    }

    if (typeof error === "object" && "status" in error) {
      switch (error.status) {
        case 422:
          return {
            status: BranchCreationStatus.BranchAlreadyExists,
            message: `Branch '${branch}' already exists. Error: ${error}`,
          }
        case 401:
          return {
            status: BranchCreationStatus.Unauthorized,
            message: "Unauthorized access. Please check your credentials.",
          }
        case 404:
        default:
          return {
            status: BranchCreationStatus.UnknownError,
            message: `An unknown error occurred. Error: ${error}`,
          }
      }
    }
    return {
      status: BranchCreationStatus.UnknownError,
      message: "An unknown error occurred.",
    }
  }
}
