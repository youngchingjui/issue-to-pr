import getOctokit from "@/lib/github";

export interface BranchInfo {
  name: string
  commitDate?: string // ISO string
}

/**
 * Fetch up to `perPage` branches and return name array.
 */
export async function listBranches(
  repoFullName: string,
  perPage = 100
): Promise<string[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  const { data } = await octokit.rest.repos.listBranches({
    owner,
    repo,
    per_page: perPage,
  })
  return data.map((b) => b.name)
}

/**
 * Fetch the default branch of a repository.
 */
export async function getDefaultBranch(repoFullName: string): Promise<string> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  const { data } = await octokit.rest.repos.get({ owner, repo })
  return data.default_branch
}

/**
 * Fetch branch info (name + latest commit date) for the first `limit` branches.
 * Returns the array sorted by latest commit date (desc).
 */
export async function listBranchInfo(
  repoFullName: string,
  limit = 100
): Promise<BranchInfo[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  const { data: branches } = await octokit.rest.repos.listBranches({
    owner,
    repo,
    per_page: limit,
  })

  // Fetch last commit date for each branch (only HEAD commit)
  const branchInfos: BranchInfo[] = await Promise.all(
    branches.map(async (b) => {
      try {
        const commitResp = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: b.commit.sha,
        })
        return {
          name: b.name,
          commitDate: commitResp.data.commit.author?.date,
        }
      } catch (err) {
        console.error("Failed to fetch commit info for branch", b.name, err)
        return {
          name: b.name,
        }
      }
    })
  )

  branchInfos.sort((a, b) => {
    if (a.commitDate && b.commitDate) {
      return b.commitDate.localeCompare(a.commitDate)
    }
    if (a.commitDate) return -1
    if (b.commitDate) return 1
    return 0
  })
  return branchInfos
}

