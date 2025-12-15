// TODO: Migrate to /lib/utils/server.ts

import { AsyncLocalStorage } from "node:async_hooks"

import { getLocalRepoDir } from "@/lib/fs"
import {
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
  ensureValidRepo,
  setRemoteOrigin,
} from "@/lib/git"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getCloneUrlWithAccessToken } from "@/lib/utils/utils-common"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

// TODO: I think we should follow prescribed protocol for using the installation ID from Github.
// Usually they are provided via webhooks, or you can retrieve via their API.
// We should get rid of this function and follow the recommended approach from Github API.
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
 * 2. Build an authenticated clone URL using the repository's GitHub App installation token.
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
    // 1. Determine an authenticated clone URL using the installation token
    const [owner, repo] = repoFullName.split("/")
    const installationToken = await getInstallationTokenFromRepo({
      owner,
      repo,
    })
    const cloneUrl = getCloneUrlWithAccessToken(repoFullName, installationToken)

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
