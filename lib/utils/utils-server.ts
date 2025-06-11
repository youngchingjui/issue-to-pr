// These utils are for server-side code
import "server-only"

import { AsyncLocalStorage } from "node:async_hooks"

import { auth } from "@/auth"
import { getLocalRepoDir } from "@/lib/fs"
import {
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
  ensureValidRepo,
} from "@/lib/git"
import getOctokit from "@/lib/github"
import { getCloneUrlWithAccessToken } from "@/lib/utils/utils-common"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

export function getInstallationId(): string | null {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    return null
  }
  return store.installationId
}

export async function setupLocalRepository({
  repoFullName,
  workingBranch = "main",
}: {
  repoFullName: string
  workingBranch?: string
}): Promise<string> {
  // Get or create a local directory to work off of
  const baseDir = await getLocalRepoDir(repoFullName)

  try {
    let cloneUrl: string

    // First try user session authentication
    const session = await auth()
    if (session?.token?.access_token) {
      cloneUrl = getCloneUrlWithAccessToken(
        repoFullName,
        session.token.access_token as string
      )
    } else {
      // Fallback to GitHub App authentication
      const octokit = await getOctokit()
      if (!octokit) {
        throw new Error("Failed to get authenticated Octokit instance")
      }

      // Get the repository details to get the clone URL
      const [owner, repo] = repoFullName.split("/")
      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo,
      })

      cloneUrl = repoData.clone_url as string

      // If we have an installation ID, modify the clone URL to use the installation token
      const installationId = getInstallationId()
      if (installationId) {
        const token = (await octokit.auth({
          type: "installation",
          installationId: Number(installationId),
        })) as { token: string }
        cloneUrl = getCloneUrlWithAccessToken(repoFullName, token.token)
      }
    }

    // Check repository state and repair if needed
    await ensureValidRepo(baseDir, cloneUrl)

    // Try clean checkout with retries
    let retries = 3
    while (retries > 0) {
      try {
        await cleanCheckout(workingBranch, baseDir)
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.error(
            `[ERROR] Failed to clean checkout after retries: ${error}`
          )
          throw error
        }
        console.warn(
          `[WARNING] Clean checkout failed, retrying... (${retries} attempts left)`
        )
        await cleanupRepo(baseDir)
        await cloneRepo(cloneUrl, baseDir)
      }
    }

    return baseDir
  } catch (error) {
    console.error(`[ERROR] Failed to setup repository: ${error}`)
    // Clean up on failure
    await cleanupRepo(baseDir)
    throw error
  }
}
