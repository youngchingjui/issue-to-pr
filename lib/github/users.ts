"use server"

import { getInstallationPermissions, getUserOctokit } from "@/lib/github"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { getInstallationFromRepo, listUserAppRepositories } from "@/lib/github/repos"
import { GitHubUser, RepoPermissions } from "@/lib/types/github"

/**
 * @deprecated Use getGithubUser from @shared/adapters/github/users.ts instead
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
 * Check if the currently authenticated user (if available) or the GitHub App installation
 * handling the current request has the right permissions on the provided repository.
 *
 * The function never throws for the common "repo not found / not installed / unauthenticated"
 * cases. It only throws on truly unexpected failures.
 */
export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  // Try the OAuth user flow first (when a session is present)
  try {
    const repos = await listUserAppRepositories()

    // Find the repository matching the provided full name ("owner/repo")
    const repoData = repos.find((r) => r.full_name === repoFullName)

    // If the repository is not returned from the GitHub App installation list
    // we treat it as "not found / not installed" and do not throw.
    if (!repoData) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Repository not found or not installed for the GitHub App.",
      }
    }

    const { permissions } = repoData

    if (!permissions) {
      // Unexpected response shape – surface as an error
      throw new Error(`There were no permissions, strange: ${permissions}`)
    }

    const canPush = permissions.push || permissions.admin || false
    const canCreatePR = permissions.pull || permissions.admin || false

    if (!canPush || !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "Insufficient permissions. User needs push access to create branches and pull request access to create PRs.",
      }
    }

    return { canPush, canCreatePR }
  } catch {
    // If the user flow isn't available (e.g., no session token), fall back to
    // checking the GitHub App installation permissions for this repository.
    try {
      const [owner, repo] = repoFullName.split("/")
      if (!owner || !repo) {
        return {
          canPush: false,
          canCreatePR: false,
          reason: `Invalid repo full name: ${repoFullName}`,
        }
      }

      // Verify this repository has our GitHub App installed. If not, report gracefully.
      try {
        await getInstallationFromRepo({ owner, repo })
      } catch {
        return {
          canPush: false,
          canCreatePR: false,
          reason: "Repository not found or not installed for the GitHub App.",
        }
      }

      // Read installation permissions from the current async context's installation ID
      const installationPerms = await getInstallationPermissions()
      if (!installationPerms) {
        return {
          canPush: false,
          canCreatePR: false,
          reason:
            "Unable to determine installation permissions (missing auth context).",
        }
      }

      // Map GitHub App installation permissions to our booleans
      const contentsPerm = installationPerms.contents
      const prPerm = installationPerms.pull_requests

      const canPush = contentsPerm === "write"
      const canCreatePR = prPerm === "write"

      return {
        canPush,
        canCreatePR,
        reason:
          canPush && canCreatePR
            ? undefined
            : "Limited installation permissions available",
      }
    } catch (installationFlowError) {
      // Only now do we report a hard failure – network, configuration, etc.
      console.error(
        "Error checking repository permissions (installation flow):",
        installationFlowError
      )
      throw new Error(
        `Failed to check permissions: ${installationFlowError instanceof Error ? installationFlowError.message : String(installationFlowError)}`
      )
    }
  }
}

export { listUserRepositories }

