"use server"

import { getInstallationOctokit, getUserOctokit } from "@/shared/lib/github"
import { listUserRepositories } from "@/shared/lib/github/graphql/queries/listUserRepositories"
import {
  getInstallationFromRepo,
  listUserAppRepositories,
} from "@/shared/lib/github/repos"
import {
  type GitHubUser,
  type RepoPermissions,
} from "@/shared/lib/types/github"

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
    const [owner, repo] = repoFullName.split("/")

    // 1) Ensure our GitHub App is installed on this repository
    let installationId: number | null = null
    try {
      const installation = await getInstallationFromRepo({ owner, repo })
      installationId = installation?.data?.id ?? null
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? "status" in (error as Record<string, unknown>) &&
            typeof (error as Record<string, unknown>).status === "number"
            ? ((error as { status: number }).status as number)
            : undefined
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

    // 2) Retrieve the installation's permission scopes
    if (!installationId) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Unable to determine installation id for the repository.",
      }
    }

    const installationOctokit = await getInstallationOctokit(installationId)
    const installationAuth = await installationOctokit.auth({
      type: "installation",
    })
    const hasPermissionsObject =
      installationAuth &&
      typeof installationAuth === "object" &&
      "permissions" in installationAuth &&
      installationAuth.permissions &&
      typeof (installationAuth as { permissions?: unknown }).permissions ===
        "object"
    const permissions = hasPermissionsObject
      ? (installationAuth as { permissions: Record<string, string> })
          .permissions
      : undefined

    // Fallback safety: if for some reason we couldn't get permissions, assume no access
    if (!permissions || typeof permissions !== "object") {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Unable to determine installation permissions.",
      }
    }

    // Determine capabilities required by our workflow
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
  } catch (error) {
    // Fallback: if installation-based check fails (e.g., no app credentials), use
    // the user-context flow to preserve previous behavior in non-worker contexts.
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
    } catch (fallbackError) {
      console.error("Error checking repository permissions:", error)
      throw new Error(
        `Failed to check permissions: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      )
    }
  }
}

export { listUserRepositories }
