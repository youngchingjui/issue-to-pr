"use server"

import { getUserOctokit } from "@/lib/github"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { listUserAppRepositories } from "@/lib/github/repos"
import { GitHubUser, RepoPermissions } from "@/lib/types/github"

/**
 * @deprecated Use getGithubUser from @/shared/adapters/github/users.ts instead
 */
export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getUserOctokit()
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

/**
 * Check if the currently authenticated user has the right permissions on the
 * provided repository.  The function **never throws** for the common "repo not
 * found / not installed" case because the caller should be able to rely on the
 * boolean flags instead of handling exceptions.
 */
export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  try {
    const repos = await listUserAppRepositories()

    // Find the repository matching the provided full name ("owner/repo")
    const repoData = repos.find((r) => r.full_name === repoFullName)

    // If the repository is not returned from the GitHub App installation list
    // we treat it as "not found / not installed" and **do not throw**.  This
    // allows consumers to render proper UI messages without having to perform
    // exception control-flow.
    if (!repoData) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Repository not found or not installed for the GitHub App.",
      }
    }

    const { permissions } = repoData

    if (!permissions) {
      // This should not normally happen – log & propagate as an error because
      // it indicates an unexpected response shape from GitHub.
      throw new Error(`There were no permissions, strange: ${permissions}`)
    }

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
    // Other errors (network, auth, etc.) are still surfaced so that calling
    // code can decide how to handle them.
    console.error("Error checking repository permissions:", error)
    throw new Error(
      `Failed to check permissions: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export { listUserRepositories }
