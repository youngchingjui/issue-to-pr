import getOctokit from "@/lib/github"
import { GitHubUser, RepoPermissions } from "@/lib/types/github"

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      console.log("No Octokit instance found")
      return null
    }

    const { data: user } = await octokit.users.getAuthenticated()
    return user
  } catch (e) {
    console.error(e)
    return null
  }
}

interface GithubPermissions {
  admin?: boolean
  push?: boolean
  pull?: boolean
  maintain?: boolean
}

export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "No GitHub authentication found",
      }
    }

    const [owner, repo] = repoFullName.split("/")

    // Get repository permissions for the authenticated user
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    })

    // Check if user has push access
    const permissions = (repoData.permissions || {}) as GithubPermissions
    const canPush = permissions.push || permissions.admin || false
    const canCreatePR = permissions.pull || permissions.admin || false

    if (!canPush && !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "Insufficient permissions. User needs push access to create branches and pull request access to create PRs.",
      }
    }

    return {
      canPush,
      canCreatePR,
      reason:
        canPush && canCreatePR ? undefined : "Limited permissions available",
    }
  } catch (error) {
    console.error("Error checking repository permissions:", error)
    return {
      canPush: false,
      canCreatePR: false,
      reason: `Failed to check permissions: ${error.message || "Unknown error"}`,
    }
  }
}
