import { Octokit } from "@octokit/rest"
import * as fs from "fs"
import { App } from "octokit"

import { auth, refreshAuthToken } from "@/auth"
import { getInstallationId } from "@/lib/utils-server"

function getPrivateKeyFromFile(): string {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return fs.readFileSync(privateKeyPath, "utf8")
}

// Utility function to log error messages
type LogFunction = (message: string) => void
const logError: LogFunction = (message) => {
  console.error(`[GitHub Auth Error] ${message}`)
}

// Function to check if a token is valid
async function isTokenValid(token: string): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token })
    await octokit.request("GET /user")  // Simple endpoint to verify token
    return true
  } catch (error) {
    logError("Token is invalid or expired.")
    return false
  }
}

export default async function getOctokit(): Promise<Octokit> {
  // Try to authenticate using user session
  let session = await auth()
  if (session?.user?.accessToken) {
    // Check if the current token is valid
    const valid = await isTokenValid(session.user.accessToken)
    if (!valid) {
      // Refresh the token
      try {
        session = await refreshAuthToken(session)
        if (!session || !session.user?.accessToken) {
          logError("Failed to refresh token.")
        }
      } catch (error) {
        logError("Error refreshing token: " + error.message)
        throw error // Rethrow after logging
      }
    }
    // Return a new Octokit instance with the (possibly refreshed) token
    return new Octokit({ auth: session.user.accessToken })
  }

  // Fallback to GitHub App authentication
  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: getPrivateKeyFromFile(),
  })

  // Assuming you have the installation ID from the webhook or other source
  const installationId = getInstallationId()

  return (await app.getInstallationOctokit(
    Number(installationId)
  )) as unknown as Octokit // Removes extra properties for pagination and retry capabilities
}
