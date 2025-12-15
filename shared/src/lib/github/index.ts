"use server"

import { createAppAuth } from "@octokit/auth-app"
import { createOAuthUserAuth } from "@octokit/auth-oauth-user"
import { graphql } from "@octokit/graphql"
import { Octokit } from "@octokit/rest"
import * as fs from "fs/promises"
import { App } from "octokit"

import { getAccessTokenOrThrow } from "@shared/auth"
import { ExtendedOctokit } from "@/lib/types/github"

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
  const token = getAccessTokenOrThrow()

  const userOctokit = new Octokit({ auth: token })

  return { ...userOctokit, authType: "user" }
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

// TODO: Get rid of
export async function getTestInstallationOctokit(
  installationId?: number
): Promise<ExtendedOctokit> {
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
export async function getUserOctokit(): Promise<Octokit> {
  const token = getAccessTokenOrThrow()

  // `clientId` and `clientSecret` are already determined by
  // auth.js library when authenticating user in `auth.js`.
  // No need to add them here, as they're inferred in the `access_token`
  const userOctokit = new Octokit({
    authStrategy: createOAuthUserAuth,
    auth: {
      clientType: "github-app",
      token,
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

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()

  const installationOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })

  return installationOctokit
}

export async function getAppOctokit(): Promise<App> {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()
  const app = new App({
    appId,
    privateKey,
  })
  return app
}
