// TODO: Migrate to /lib/utils/server.ts

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
  setRemoteOrigin,
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

/**
 * Prepare a local working copy of a GitHub repository.
 *
 * This helper makes sure that the repository identified by `repoFullName` is
 * available in a local working directory that the server can freely mutate.
 * The steps performed are:
 * 1. Resolve (and lazily create) the base directory via `getLocalRepoDir`.
 * 2. Build an authenticated clone URL using either the current user session's
 *    OAuth token (if present) or a GitHub App installation token exposed
 *    through `runWithInstallationId` / `getInstallationId`.
 * 3. Verify that the local repository is healthy via `ensureValidRepo`; if it
 *    is corrupt or missing, attempt a fresh clone.
 * 4. Ensure the local repo's "origin" remote uses the authenticated URL so
 *    subsequent fetches succeed.
 * 5. Perform a clean checkout of `workingBranch`, retrying up to three times
 *    and re-cloning when necessary.
 *
 * The function is resilient to transient git failures and cleans up the local
 * directory on unrecoverable errors.
 *
 * @param {Object} params                           - Function parameters.
 * @param {string} params.repoFullName              - Full repository name in
 *                                                   the form "owner/repo".
 * @param {string} [params.workingBranch="main"]   - Branch to check out for
 *                                                   subsequent operations.
 * @returns {Promise<string>} Absolute path to the prepared local repository
 *                            directory.
 * @throws {Error} If the repository cannot be prepared after all retries.
 */
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

    // 1. Determine an authenticated clone URL
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

      const [owner, repo] = repoFullName.split("/")
      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo,
      })

      cloneUrl = repoData.clone_url as string

      const installationId = getInstallationId()
      if (installationId) {
        const token = (await octokit.auth({
          type: "installation",
          installationId: Number(installationId),
        })) as { token: string }
        cloneUrl = getCloneUrlWithAccessToken(repoFullName, token.token)
      }
    }

    // 2. Ensure repository exists and is healthy
    await ensureValidRepo(baseDir, cloneUrl)

    // 3. Always make sure the "origin" remote points to our authenticated URL
    try {
      await setRemoteOrigin(baseDir, cloneUrl)
    } catch (e) {
      // Not fatal; log and continue. Subsequent operations may still work.
      console.warn(`[WARNING] Failed to set authenticated remote: ${e}`)
    }

    // 4. Clean checkout with retries
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
