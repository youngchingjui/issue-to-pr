import { Octokit } from "@octokit/rest"
import * as fs from "fs"
import { App } from "octokit"

import { auth } from "@/auth"
import { getInstallationId } from "@/lib/utils-server"

function getPrivateKeyFromFile(): string {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return fs.readFileSync(privateKeyPath, "utf8")
}

export default async function getOctokit(): Promise<Octokit | null> {
  // Try to authenticate using user session
  const session = await auth()
  if (session?.token?.access_token) {
    return new Octokit({ auth: session.token.access_token })
  }

  // Fallback to GitHub App authentication
  try {
    const privateKey = getPrivateKeyFromFile()
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
