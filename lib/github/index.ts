"use server"

import { createAppAuth } from "@octokit/auth-app"
import { createOAuthUserAuth } from "@octokit/auth-oauth-user"
import { graphql } from "@octokit/graphql"
import { Octokit } from "@octokit/rest"
import * as fs from "fs/promises"
import { App } from "octokit"

import { auth } from "@/auth"
import { ExtendedOctokit } from "@/lib/types/github"
import { getInstallationId } from "@/lib/utils/utils-server"

export async function getPrivateKeyFromFile(): Promise<string> {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return await fs.readFile(privateKeyPath, "utf8")
}

/**
 * Creates an authenticated Octokit client using one of two authentication methods:
 * 1. User Authentication: Tries to use the user's session token first
 * 2. GitHub App Authentication: Falls back to using GitHub App credentials (private key + app ID)
 *    if user authentication fails
 *
 * Returns either an authenticated Octokit instance or null if both auth methods fail
 *
 * @deprecated Use getUserOctokit or getInstallationOctokit instead
 */
export default async function getOctokit(): Promise<ExtendedOctokit | null> {
  const session = await auth()

  if (session?.token?.access_token) {
    const userOctokit = new Octokit({ auth: session.token.access_token })

    return { ...userOctokit, authType: "user" }
  }

  // Fallback to GitHub App authentication
  const appId = process.env.GITHUB_APP_ID

  if (!appId) {
    throw new Error("GITHUB_APP_ID is not set")
  }

  try {
    const privateKey = await getPrivateKeyFromFile()

    // Assuming you have the installation ID from the webhook or other source
    const installationId = getInstallationId()
    if (!installationId) {
      return null
    }

    const installationOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })

    return { ...installationOctokit, authType: "app" }
  } catch (error) {
    console.error("[ERROR] Failed to setup GitHub App authentication:", error)
    return null
  }
}

/**
 * Creates an authenticated GraphQL client using Github App Authentication
 */
export async function getGraphQLClient(): Promise<typeof graphql | null> {
  const octokit = await getOctokit()

  if (!octokit) {
    return null
  }

  return octokit.graphql
}

/**
 * Returns the permissions object for the current GitHub App installation.
 */
export async function getInstallationPermissions() {
  try {
    const privateKey = await getPrivateKeyFromFile()
    if (!process.env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not set")
    const installationId = getInstallationId()
    if (!installationId) throw new Error("Installation ID not found")

    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
      installationId: Number(installationId),
    })

    // Get the installation token and permissions
    const { permissions } = await auth({ type: "installation" })
    return permissions
  } catch (error) {
    console.error("[ERROR] Failed to get installation permissions:", error)
    return null
  }
}

type OctokitAuthToken = {
  type: "token"
  tokenType: "installation" | "user-to-server"
  token: string
}

function isOctokitAuthToken(obj: unknown): obj is OctokitAuthToken {
  if (typeof obj !== "object" || obj == null) {
    return false
  }
  const o = obj as Record<string, unknown>
  return (
    o.type === "token" &&
    (o.tokenType === "installation" || o.tokenType === "user-to-server") &&
    typeof o.token === "string"
  )
}

/**
 * Returns a token that can be used for git operations (HTTPS).
 * If the current session is an OAuth user, returns the user token.
 * Otherwise returns the GitHub App installation access token.
 */
export async function getAuthToken(
  octokit: ExtendedOctokit | null
): Promise<OctokitAuthToken | null> {
  if (!octokit) {
    octokit = await getOctokit()
  }

  if (!octokit) {
    return null
  }

  let type: "installation" | null
  // If the current session is an OAuth user, returns the user token.
  if (octokit.authType === "user") {
    type = null
  } else {
    type = "installation"
  }

  const auth = await octokit.auth({ type })

  if (isOctokitAuthToken(auth)) {
    return auth
  } else {
    throw new Error(`Did not get expected auth shape: ${String(auth)}`)
  }
}

export async function getTestInstallationOctokit(installationId?: number) {
  // Installation ID for user: "youngchingjui" and Github App: "dev-issue-to-pr"
  const BACKUP_INSTALLATION_ID = 77503233

  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()

  const installationOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId: installationId ?? BACKUP_INSTALLATION_ID,
    },
  })

  return { ...installationOctokit, authType: "app" }
}

/**
 * Creates an authenticated Octokit client using the OAuth user authentication strategy.
 * This function uses the existing session tokens from NextAuth to authenticate with GitHub.
 *
 * This is an alternative to getUserOctokit() that uses the @octokit/auth-oauth-user strategy
 * instead of directly passing the access token to the Octokit constructor.
 *
 * @returns An authenticated Octokit instance or throws an error if authentication fails
 */
export async function getUserOctokit() {
  const session = await auth()

  if (!session?.token?.access_token) {
    throw new Error("No session token found")
  }

  if (typeof session.token.access_token !== "string") {
    throw new Error("Access token is not a string")
  }

  const userOctokit = new Octokit({
    authStrategy: createOAuthUserAuth,
    auth: {
      clientId: process.env.GITHUB_APP_CLIENT_ID!,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
      clientType: "github-app",
      token: session.token.access_token,
    },
  })

  return userOctokit
}

export async function getUserInstallations() {
  const octokit = await getUserOctokit()

  const { data: installations } = await octokit.request(
    "GET /user/installations"
  )

  return installations.installations
}

export async function getInstallationOctokit(installationId: number) {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()

  const installationOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })

  return installationOctokit
}

export async function getAppOctokit() {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()
  const app = new App({
    appId,
    privateKey,
  })
  return app
}
