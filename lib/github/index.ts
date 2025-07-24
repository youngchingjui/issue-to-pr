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
 * Creates an authenticated Octokit client.
 *
 * Preference order (as of 2024-07 after OAuth scope reduction):
 * 1. GitHub App installation token – if the current async context carries an
 *    installationId (set via runWithInstallationId).
 * 2. User OAuth token – only used as a fallback when no installation token is
 *    available. This allows us to keep the OAuth scope minimal whilst still
 *    supporting UI features that need to act on behalf of the user (e.g.
 *    listing their personal repositories).
 */
export default async function getOctokit(): Promise<ExtendedOctokit | null> {
  // 1. Try GitHub App authentication first – only possible if we have an installationId
  const installationId = getInstallationId()
  if (installationId) {
    try {
      const privateKey = await getPrivateKeyFromFile()
      if (!process.env.GITHUB_APP_ID) {
        throw new Error("GITHUB_APP_ID is not set")
      }

      const app = new App({
        appId: process.env.GITHUB_APP_ID,
        privateKey,
      })

      const appOctokit = (await app.getInstallationOctokit(
        Number(installationId)
      )) as unknown as Octokit

      // Retrieve fine-grained installation permissions once so callers can
      // make authorisation decisions without additional round-trips.
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
      console.error(
        "[ERROR] Failed to setup GitHub App authentication, falling back to user OAuth:",
        error
      )
      // fall through to OAuth fallback
    }
  }

  // 2. Fallback to user OAuth session
  try {
    const session = await auth()
    if (session?.token?.access_token) {
      const baseOctokit = new Octokit({ auth: session.token.access_token })
      const octokit = baseOctokit as ExtendedOctokit
      octokit.authType = "user"
      return octokit
    }
  } catch (error) {
    console.error("[ERROR] Failed to setup user OAuth authentication:", error)
  }

  // If both methods fail, return null so caller can handle unauthenticated state
  return null
}

/**
 * Returns an authenticated GraphQL client that follows the same preference
 * order as getOctokit (GitHub App first, OAuth fallback).
 */
export async function getGraphQLClient() {
  // Prefer GitHub App auth when possible
  const installationId = getInstallationId()
  if (installationId) {
    try {
      const privateKey = await getPrivateKeyFromFile()
      if (!process.env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not set")

      const auth = createAppAuth({
        appId: process.env.GITHUB_APP_ID,
        privateKey,
        installationId: Number(installationId),
      })

      return graphql.defaults({
        request: { hook: auth.hook },
      })
    } catch (error) {
      console.error(
        "[ERROR] Failed to setup GitHub App GraphQL auth, falling back to user OAuth:",
        error
      )
      // fall through to OAuth fallback
    }
  }

  // OAuth fallback
  const session = await auth()
  if (session?.token?.access_token) {
    return graphql.defaults({
      headers: {
        authorization: `token ${session.token.access_token}`,
      },
    })
  }

  return null
}

/**
 * Returns the permissions object for the current GitHub App installation.
 * When called outside of an App installation context the function returns null.
 */
export async function getInstallationPermissions() {
  try {
    const installationId = getInstallationId()
    if (!installationId) return null
    const privateKey = await getPrivateKeyFromFile()
    if (!process.env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not set")

    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
      installationId: Number(installationId),
    })

    const { permissions } = await auth({ type: "installation" })
    return permissions
  } catch (error) {
    console.error("[ERROR] Failed to get installation permissions:", error)
    return null
  }
}

/**
 * Returns a token suitable for git/HTTPS operations. Prefers the GitHub App
 * installation token to reduce reliance on user OAuth scopes.
 */
export async function getAuthToken(): Promise<{
  token: string
  authType: AuthType
} | null> {
  // Prefer installation token when available
  const installationId = getInstallationId()
  if (installationId) {
    const octokit = await getOctokit()
    if (octokit && octokit.authType === "app") {
      try {
        const octokitWithAuth = octokit as unknown as InstallationTokenProvider
        const { token } = await octokitWithAuth.auth({
          type: "installation",
          installationId: Number(installationId),
        })
        return { token, authType: "app" }
      } catch (err) {
        console.error("[ERROR] Failed to retrieve installation token", err)
        // fall through to OAuth fallback
      }
    }
  }

  // OAuth fallback (primarily for interactive UI flows)
  const session = await auth()
  if (session?.token?.access_token) {
    return { token: session.token.access_token as string, authType: "user" }
  }

  return null
}

