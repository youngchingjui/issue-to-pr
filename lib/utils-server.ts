// These utils are for server-side code

import { AsyncLocalStorage } from "node:async_hooks"

import { auth } from "@/auth"
import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists, cleanCheckout, cloneRepo } from "@/lib/git"
import { getCloneUrlWithAccessToken } from "@/lib/utils"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

export function getInstallationId(): string {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    throw new Error("Installation ID not found in context")
  }
  return store.installationId
}

export async function setupLocalRepository({
  repoFullName,
  workingBranch = "main",
}: {
  repoFullName: string
  workingBranch?: string
}) {
  // Get or create a local directory to work off of
  const baseDir = await getLocalRepoDir(repoFullName)

  // Check if .git and codebase exist in tempDir
  console.debug(`[DEBUG] Checking if .git and codebase exist in ${baseDir}`)
  const gitExists = await checkIfGitExists(baseDir)

  if (!gitExists) {
    // Clone the repo
    console.debug(`[DEBUG] Cloning repo: ${repoFullName}`)

    // TODO: Refactor for server-to-server auth
    const session = await auth()
    const token = session.user?.accessToken
    // Attach access token to cloneUrl
    const cloneUrlWithToken = getCloneUrlWithAccessToken(repoFullName, token)

    await cloneRepo(cloneUrlWithToken, baseDir)
  }

  // And git pull to latest
  await cleanCheckout(workingBranch, baseDir)

  return baseDir
}
