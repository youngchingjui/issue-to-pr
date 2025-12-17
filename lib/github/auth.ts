import "server-only"

import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import type {
  GitHubAuthProvider,
  GitHubClientBundle,
  GitHubInstallationId,
  GitHubInstallationLookup,
} from "@shared/ports/github/auth"
import * as fs from "fs/promises"
import { App } from "octokit"

import { auth } from "@/auth"

type MakeProviderOpts = {
  defaultInstallation: GitHubInstallationLookup | GitHubInstallationId
}

// Create Github App client at startup
const appId = process.env.GITHUB_APP_ID
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
if (!appId || !privateKeyPath) {
  throw new Error("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY_PATH is not set")
}
const privateKey = await fs.readFile(privateKeyPath, "utf8")
const app = new App({
  appId,
  privateKey,
})

export function makeNextjsGitHubAuthProvider(
  opts: MakeProviderOpts
): GitHubAuthProvider {
  const installationIdMap = new Map<string, Promise<number>>()

  async function requestInstallation(
    app: App,
    input: GitHubInstallationLookup
  ) {
    switch (input.kind) {
      case "repo":
        return await app.octokit.request(
          "GET /repos/{owner}/{repo}/installation",
          { owner: input.owner, repo: input.repo }
        )
      case "username":
        return await app.octokit.request("GET /users/{username}/installation", {
          username: input.username,
        })
      case "org":
        return await app.octokit.request("GET /orgs/{org}/installation", {
          org: input.org,
        })
      default:
        throw new Error("Invalid input kind")
    }
  }

  async function resolveInstallationId(
    input: GitHubInstallationLookup
  ): Promise<GitHubInstallationId> {
    const key =
      input.kind === "repo"
        ? input.owner + "/" + input.repo
        : input.kind === "username"
          ? input.username
          : input.org
    const cached = installationIdMap.get(key)
    if (cached) return cached

    const installation = await requestInstallation(app, input)
    if (!installation.data.id) {
      throw new Error("Installation ID not found")
    }
    return installation.data.id
  }

  async function getUserClient(): Promise<GitHubClientBundle<"user">> {
    const session = await auth()
    const token = session?.token?.access_token
    if (!token || typeof token !== "string") {
      throw new Error("Authentication required")
    }
    const client = new Octokit({ auth: token })
    return { kind: "user", rest: client, graphql: client.graphql }
  }

  async function getInstallationClient(): Promise<
    GitHubClientBundle<"installation">
  > {
    const { defaultInstallation } = opts

    let installationId: number

    if (typeof defaultInstallation === "number") {
      installationId = defaultInstallation
    } else {
      installationId = await resolveInstallationId(defaultInstallation)
    }
    const client = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })

    return {
      kind: "installation",
      rest: client,
      graphql: client.graphql,
    }
  }

  return { getUserClient, getInstallationClient }
}
