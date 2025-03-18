import { Octokit } from "@octokit/rest"
import * as fs from "fs"
import { App } from "octokit"

import { auth } from "@/auth"
import { getInstallationId } from "@/lib/utils/utils-server"

function getPrivateKeyFromFile(): string {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return fs.readFileSync(privateKeyPath, "utf8")
}

/**
 * Creates an authenticated Octokit client using one of two authentication methods:
 * 1. User Authentication: Tries to use the user's session token first
 * 2. GitHub App Authentication: Falls back to using GitHub App credentials (private key + app ID)
 *    if user authentication fails
 *
 * Returns either an authenticated Octokit instance or null if both auth methods fail
 */
export default async function getOctokit(): Promise<Octokit | null> {
  // Try to authenticate using user session
  const session = await auth()

  if (session?.token?.access_token) {
    const octokit = new Octokit({ auth: session.token.access_token })

    return octokit
  }

  // Fallback to GitHub App authentication
  try {
    const privateKey = getPrivateKeyFromFile()

    if (!process.env.GITHUB_APP_ID) {
      throw new Error("GITHUB_APP_ID is not set")
    }

    const app = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
    })

    // Assuming you have the installation ID from the webhook or other source
    const installationId = getInstallationId()
    if (!installationId) {
      return null
    }

    return (await app.getInstallationOctokit(
      Number(installationId)
    )) as unknown as Octokit // Removes extra properties for pagination and retry capabilities
  } catch (error) {
    console.error("[ERROR] Failed to setup GitHub App authentication:", error)
    return null
  }
}
