"use server"

import { getInstallationOctokit, getUserInstallations } from "@/lib/github"
import { RepoSelectorItem } from "@/lib/types/github"

// Minimal subset of the repository fields we actually use
type InstallationRepository = {
  id: number
  name: string
  full_name: string
  description: string | null
  updated_at: string | null
}

/**
 * Returns a deduplicated list of repositories that the current user can access **and**
 * that have the Issue-to-PR GitHub App installed.
 *
 * Workflow:
 * 1. Fetch the user's installations via OAuth (`GET /user/installations`).
 * 2. For each installation, create an installation-scoped Octokit client.
 * 3. In parallel, list repositories accessible to that installation (`GET /installation/repositories`).
 * 4. Merge & deduplicate the results by `nameWithOwner`.
 */
export async function listUserAppRepositories(): Promise<RepoSelectorItem[]> {
  // Step 1 – Fetch all installations for the authenticated user
  const installations = await getUserInstallations()

  if (!Array.isArray(installations) || installations.length === 0) {
    return []
  }

  // Step 2 & 3 – For every installation create an Octokit client and list repos *in parallel*
  const reposByInstallation = await Promise.all(
    installations.map(async (installation: { id: number }) => {
      try {
        const octokit = await getInstallationOctokit(installation.id)

        // Using the installation-scoped token, list repos accessible to that installation
        const { data } = await octokit.request(
          "GET /installation/repositories",
          { per_page: 100 }
        )

        // data.repositories contains the array of repositories
        const reposArray = (data.repositories ??
          []) as unknown as InstallationRepository[]

        return reposArray.map((repo) => ({
          name: repo.name,
          nameWithOwner: repo.full_name,
          description: repo.description,
          updatedAt: repo.updated_at || "",
        })) as RepoSelectorItem[]
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
  const uniqueReposMap = new Map<string, RepoSelectorItem>()
  for (const repo of allRepos) {
    if (!uniqueReposMap.has(repo.nameWithOwner)) {
      uniqueReposMap.set(repo.nameWithOwner, repo)
    }
  }

  return Array.from(uniqueReposMap.values())
}
