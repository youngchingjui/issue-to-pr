"use server"

import { getInstallationOctokit, getUserOctokit } from "@/lib/github"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { getInstallationFromRepo, listUserAppRepositories } from "@/lib/github/repos"
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
 * Check if we have the right permissions on the provided repository.
 *
 * Behavior:
 * - Prefer checking via the GitHub App installation on the repository.
 * - If that is not possible (e.g., missing app credentials), fall back to
 *   user-session based checking when available.
 * - For common cases (repo not found or app not installed), this function
 *   returns boolean flags and a reason string instead of throwing.
 */
export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  const [owner, repo] = repoFullName.split("/")

  // 1) Try installation-based permissions (works in webhook/worker contexts)
  try {
    let installationId: number | null = null

    try {
      const installation = await getInstallationFromRepo({ owner, repo })
      installationId = installation?.data?.id ?? null
    } catch (error: unknown) {
      // If the app is not installed on the repo, GitHub returns 404
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined
      if (status === 404) {
        return {
          canPush: false,
          canCreatePR: false,
          reason:
            "Repository not found or app not installed for this repository.",
        }
      }
      throw error
    }

    if (!installationId) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Unable to determine installation id for the repository.",
      }
    }

    const installationOctokit = await getInstallationOctokit(installationId)
    const auth = await installationOctokit.auth({ type: "installation" })

    const hasPermissionsObject =
      auth && typeof auth === "object" && "permissions" in auth
    const permissions = hasPermissionsObject
      ? (auth as { permissions?: Record<string, string> }).permissions
      : undefined

    if (!permissions || typeof permissions !== "object") {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Unable to determine installation permissions.",
      }
    }

    // Installation permission strings are typically "read" | "write"
    const canPush = permissions.contents === "write"
    const canCreatePR = permissions.pull_requests === "write"

    if (!canPush || !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "GitHub App installation lacks required scopes (contents:write, pull_requests:write).",
      }
    }

    return { canPush, canCreatePR }
  } catch (installationError) {
    // Fall back to user-based permissions (used in browser/session contexts)
    try {
      const repos = await listUserAppRepositories()
      const repoData = repos.find((r) => r.full_name === repoFullName)

      if (!repoData) {
        return {
          canPush: false,
          canCreatePR: false,
          reason: "Repository not found or not installed for the GitHub App.",
        }
      }

      const { permissions } = repoData
      if (!permissions) {
        // Unexpected response shape
        return {
          canPush: false,
          canCreatePR: false,
          reason: "Unexpected: repository permissions missing in response.",
        }
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
    } catch (userFallbackError) {
      console.error(
        "Error checking repository permissions (installation and user fallback failed):",
        installationError,
        userFallbackError
      )
      return {
        canPush: false,
        canCreatePR: false,
        reason: `Failed to check permissions: ${
          userFallbackError instanceof Error
            ? userFallbackError.message
            : String(userFallbackError)
        }`,
      }
    }
  }
}

export { listUserRepositories }

