import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import type { GitHubAuthProvider } from "@/shared/ports/github/auth"

export function makeInstallationAuthProvider(params: {
  installationId: number
  appId: string
  privateKey: string
}): GitHubAuthProvider {
  const { installationId, appId, privateKey } = params
  return {
    async getInstallationClient() {
      const client = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId, privateKey, installationId },
      })
      return { kind: "installation", rest: client, graphql: client.graphql }
    },
    async getUserClient() {
      throw new Error("User auth not available in this context")
    },
  }
}

