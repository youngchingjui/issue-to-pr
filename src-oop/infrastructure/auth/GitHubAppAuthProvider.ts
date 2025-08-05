// src-oop/infrastructure/auth/GitHubAppAuthProvider.ts
import getOctokit from "@/lib/github"
import {
  IGitHubAppAuthProvider,
  RepositoryAuth,
  IInstallationContext,
} from "../../types/repository-setup"

export class GitHubAppAuthProvider implements IGitHubAppAuthProvider {
  constructor(private readonly context: IInstallationContext) {}

  async getAuthentication(): Promise<RepositoryAuth> {
    const octokit = await getOctokit()

    if (!octokit) {
      throw new Error("Failed to get authenticated Octokit instance")
    }

    const installationId = this.context.getInstallationId()

    if (!installationId) {
      throw new Error("No installation ID available")
    }

    const token = (await octokit.auth({
      type: "installation",
      installationId: Number(installationId),
    })) as { token: string }

    return new RepositoryAuth(token.token, "app")
  }
}
