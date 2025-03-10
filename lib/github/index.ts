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

export default async function getOctokit(): Promise<Octokit> {
  // Try to authenticate using user session
  const session = await auth()
  console.log("Session:", {
    hasToken: !!session?.token,
    hasAccessToken: !!session?.token?.access_token,
    env: process.env.NODE_ENV,
  })

  if (session?.token?.access_token) {
    console.log("Creating Octokit client with token info:", {
      tokenType: session.token.token_type,
      scope: session.token.scope,
      expiresAt: session.token.expires_at,
    })

    const octokit = new Octokit({ auth: session.token.access_token })

    // Test the token's permissions
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated()
      console.log("Authenticated as:", {
        login: user.login,
        type: user.type,
        scopes:
          typeof session.token.scope === "string"
            ? session.token.scope.split(" ")
            : [],
      })
    } catch (error) {
      console.error("Failed to get authenticated user:", error)
    }

    return octokit
  }

  // Skip GitHub App authentication in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      "No OAuth token found and skipping GitHub App authentication in development"
    )
    throw new Error(
      "No authentication method available. Please ensure you are logged in."
    )
  }

  // Fallback to GitHub App authentication in production
  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: getPrivateKeyFromFile(),
  })

  // Assuming you have the installation ID from the webhook or other source
  const installationId = getInstallationId()

  if (!installationId) {
    console.log("No installation ID found")
    return null
  }

  return (await app.getInstallationOctokit(
    Number(installationId)
  )) as unknown as Octokit // Removes extra properties for pagination and retry capabilities
}
