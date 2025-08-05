// src/infrastructure/auth/github-app-auth-provider.ts
import getOctokit from "@/lib/github"

import type {
  AuthenticationProvider,
  InstallationContext,
  RepositoryAuth,
} from "../../types/repository-setup"

export const createGitHubAppAuthProvider = (
  context: InstallationContext
): AuthenticationProvider => ({
  getAuthentication: async (): Promise<RepositoryAuth> => {
    const octokit = await getOctokit()

    if (!octokit) {
      throw new Error("Failed to get authenticated Octokit instance")
    }

    const installationId = context.getInstallationId()

    if (!installationId) {
      throw new Error("No installation ID available")
    }

    const token = (await octokit.auth({
      type: "installation",
      installationId: Number(installationId),
    })) as { token: string }

    return {
      token: token.token,
      type: "app",
    }
  },
})
