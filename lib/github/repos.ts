"use server"

import {
  getAppOctokit,
  getUserInstallations,
  getUserOctokit,
} from "@/lib/github"
import { combineRepositories, getUserRepositories } from "@/lib/github/content"
import { AuthenticatedUserRepository } from "@/lib/types/github"

/**
 * Returns a deduplicated list of repositories that the current user can access **and**
 * that have the Issue-to-PR GitHub App installed.
 *
 * Workflow:
 * 1. Fetch the user's installations via OAuth (`GET /user/installations`).
 * 2. For each installation, use the OAuth user token to query repositories **that the user can access within that installation**.
 * 3. In parallel, list repositories accessible to the user for that installation (`GET /user/installations/{installation_id}/repositories`).
 * 4. Merge & deduplicate the results by `nameWithOwner`.
 */
export async function listUserAppRepositories(): Promise<
  AuthenticatedUserRepository[]
> {
  // Step 1 – Fetch all installations for the authenticated user
  const installations = await getUserInstallations()

  if (!Array.isArray(installations) || installations.length === 0) {
    return []
  }

  // Step 2 & 3 – For every installation, list repositories the **user** can access within that installation *in parallel*
  const userOctokit = await getUserOctokit()

  const reposByInstallation = await Promise.all(
    installations.map(async (installation: { id: number }) => {
      try {
        const {
          data: { repositories },
        } = await userOctokit.request(
          "GET /user/installations/{installation_id}/repositories",
          { installation_id: installation.id, per_page: 100 }
        )

        return repositories
      } catch (error) {
        console.error(
          `[github/repos] Failed to list repositories for installation ${installation.id}:`,
          error
        )
        return []
      }
    })
  )

  // Flatten the array of arrays into a single list
  const allRepos = reposByInstallation.flat()

  // Step 4 – Deduplicate by `nameWithOwner`
  const uniqueReposMap = new Map<string, (typeof allRepos)[0]>()
  for (const repo of allRepos) {
    if (!uniqueReposMap.has(repo.full_name)) {
      uniqueReposMap.set(repo.full_name, repo)
    }
  }

  return Array.from(uniqueReposMap.values())
}

/**
 * Helper for the user profile page: returns the UNION of
 *  - repositories owned by the target username (public + what the API exposes)
 *  - repositories that have our GitHub App installed AND are owned by the target username
 *
 * This avoids surfacing app-installed repositories owned by other users/orgs
 * when viewing a specific user's profile.
 */
export async function listUserOwnedAndAppInstalledRepositories(
  username: string
): Promise<AuthenticatedUserRepository[]> {
  // Fetch repos owned by the target username
  const owned = await getUserRepositories(username, {
    type: "owner",
    sort: "updated",
    direction: "desc",
    per_page: 100,
    page: 1,
  })

  // Fetch app-installed repos for the current authenticated user and
  // narrow them down to those owned by the target username
  let appRepos: AuthenticatedUserRepository[] = []
  try {
    appRepos = await listUserAppRepositories()
  } catch {
    // Likely unauthenticated; proceed with owned-only
    appRepos = []
  }
  const target = username.toLowerCase()
  const appOwnedByTarget = appRepos.filter(
    (r) => r.owner?.login?.toLowerCase() === target
  )

  // Combine and dedupe by id
  return combineRepositories(owned.repositories, appOwnedByTarget)
}

export async function getInstallationFromRepo({
  owner,
  repo,
}: {
  owner: string
  repo: string
}) {
  const app = await getAppOctokit()

  const result = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    {
      owner,
      repo,
    }
  )

  return result
}

