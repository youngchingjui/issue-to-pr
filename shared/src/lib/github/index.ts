"use server"

import { createAppAuth } from "@octokit/auth-app"
import { graphql } from "@octokit/graphql"
import { Octokit } from "@octokit/rest"
import * as fs from "fs/promises"
import { App } from "octokit"

import type { ExtendedOctokit } from "@/shared/lib/types/github"

export async function getPrivateKeyFromFile(): Promise<string> {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return await fs.readFile(privateKeyPath, "utf8")
}

/**
 * @deprecated Not available in shared package. Use repo-scoped installation clients instead.
 */
export default async function getOctokit(): Promise<ExtendedOctokit | null> {
  throw new Error(
    "shared/lib/github:getOctokit is deprecated. Use installation-scoped clients (getInstallationOctokit) at the call site."
  )
}

/**
 * @deprecated Not available in shared package. Use installation-scoped clients instead.
 */
export async function getGraphQLClient(): Promise<typeof graphql | null> {
  throw new Error(
    "shared/lib/github:getGraphQLClient is deprecated. Use installationOctokit.graphql for a specific repo."
  )
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
 * Creates an authenticated Octokit client for a GitHub App installation.
 */
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

