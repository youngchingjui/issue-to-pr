"use server"

import { createAppAuth } from "@octokit/auth-app"
import { graphql } from "@octokit/graphql"
import { Octokit } from "@octokit/rest"
import * as fs from "fs/promises"
import { App } from "octokit"

import { auth } from "@/auth"
import { getInstallationId } from "@/lib/utils/utils-server"

type AuthType = "user" | "app"

interface InstallationPermissions {
  contents?: "none" | "read" | "write" | "admin"
  pull_requests?: "none" | "read" | "write" | "admin"
  // include any additional permissions GitHub may return
  [key: string]: string | undefined
}

export type ExtendedOctokit = Octokit & {
  authType: AuthType
  /**
   * Only set when authType === "app". Reflects the fine-grained installation permissions
   * returned alongside the installation access token.
   */
  installationPermissions?: InstallationPermissions
}

interface InstallationTokenProvider {
  auth: (params: {
    type: "installation"
    installationId: number
  }) => Promise<{ token: string }>
}

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
 */
export default async function getOctokit(): Promise<ExtendedOctokit | null> {
  // Try to authenticate using user session
  const session = await auth()

  if (session?.token?.access_token) {
    const baseOctokit = new Octokit({ auth: session.token.access_token })

    // Enrich with metadata so callers can differentiate
    const octokit = baseOctokit as ExtendedOctokit
    octokit.authType = "user"

    return octokit
  }

  // Fallback to GitHub App authentication
  try {
    const privateKey = await getPrivateKeyFromFile()

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

    // Create a ready-to-use Octokit client for this installation
    const appOctokit = (await app.getInstallationOctokit(
      Number(installationId)
    )) as unknown as Octokit

    // Retrieve fine-grained installation permissions once
    const authApp = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
      installationId: Number(installationId),
    })

    const { permissions } = await authApp({ type: "installation" })

    const octokit = appOctokit as ExtendedOctokit
    octokit.authType = "app"
    octokit.installationPermissions = permissions as InstallationPermissions

    return octokit
  } catch (error) {
    console.error("[ERROR] Failed to setup GitHub App authentication:", error)
    return null
  }
}

/**
 * Creates an authenticated GraphQL client using one of two authentication methods:
 * 1. User Authentication: Tries to use the user's session token first
 * 2. GitHub App Authentication: Falls back to using GitHub App credentials
 */
export async function getGraphQLClient() {
  // Try to authenticate using user session
  const session = await auth()

  if (session?.token?.access_token) {
    console.log("Using user OAuth token for authentication")
    return graphql.defaults({
      headers: {
        authorization: `token ${session.token.access_token}`,
      },
    })
  }

  // Fallback to GitHub App authentication
  try {
    console.log("Falling back to GitHub App authentication")
    const privateKey = await getPrivateKeyFromFile()

    if (!process.env.GITHUB_APP_ID) {
      throw new Error("GITHUB_APP_ID is not set")
    }

    const installationId = getInstallationId()
    if (!installationId) {
      return null
    }

    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
      installationId: Number(installationId),
    })

    console.log("Successfully created GitHub App auth hook")

    return graphql.defaults({
      request: {
        hook: auth.hook,
      },
    })
  } catch (error) {
    console.error("[ERROR] Failed to setup GitHub App authentication:", error)
    return null
  }
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

/**
 * Returns a token that can be used for git operations (HTTPS).
 * If the current session is an OAuth user, returns the user token.
 * Otherwise returns the GitHub App installation access token.
 */
export async function getAuthToken(): Promise<{
  token: string
  authType: AuthType
} | null> {
  // Try session token first
  const session = await auth()
  if (session?.token?.access_token) {
    return { token: session.token.access_token as string, authType: "user" }
  }

  // Fallback to GitHub App installation token
  const octokit = await getOctokit()
  if (!octokit || octokit.authType !== "app") return null

  const installationId = getInstallationId()
  if (!installationId) return null

  try {
    // We know that getInstallationOctokit returns an object with an `auth` function,
    // but the type definition we cast earlier does not include it.
    // Cast to a narrower interface that includes the method.
    const octokitWithAuth = octokit as unknown as InstallationTokenProvider

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const authResult = await octokitWithAuth.auth({
      type: "installation",
      installationId: Number(installationId),
    })

    if (authResult?.token) {
      return { token: authResult.token as string, authType: "app" }
    }
  } catch (err) {
    console.error("[ERROR] Failed to retrieve installation token", err)
  }

  return null
}
