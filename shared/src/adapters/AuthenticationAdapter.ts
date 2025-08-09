import type { Octokit } from "octokit"

import type { AuthenticationPort } from "@/core/ports/AuthenticationPort"

// Define session type based on NextAuth structure
interface AuthSession {
  token?: {
    access_token?: string
  }
}

// Question: To keep separation of concerns and clean code, should we be importing
// libraries from different providers such as Octokit and NextAuth and combining them here in an adapter?
// On the flip side, how else would we connect the session token from NextAuth to Octokit?

// This adapter would need to be implemented in the main app since it depends on NextAuth
// For now, we'll create a placeholder that shows the interface
export class AuthenticationAdapter implements AuthenticationPort {
  constructor(
    private readonly auth: () => Promise<AuthSession | null>,
    private readonly getOctokit: () => Promise<Octokit>,
    private readonly getInstallationId: () => string | null
  ) {}

  async getAccessToken(): Promise<string | null> {
    const session = await this.auth()
    return session?.token?.access_token || null
  }

  async getInstallationToken(owner: string, repo: string): Promise<string> {
    const octokit = await this.getOctokit()
    if (!octokit) {
      throw new Error("Failed to get authenticated Octokit instance")
    }

    const installationId = this.getInstallationId()
    if (!installationId) {
      throw new Error("No installation ID available")
    }

    const authResult = (await octokit.auth({
      type: "installation",
      installationId: Number(installationId),
    })) as { token: string }
    const { token } = authResult

    return token
  }

  async checkPushPermissions(repoFullName: string): Promise<boolean> {
    // This would need to be implemented based on your GitHub API usage
    // For now, return true as a placeholder
    return true
  }

  async checkCreatePRPermissions(repoFullName: string): Promise<boolean> {
    // This would need to be implemented based on your GitHub API usage
    // For now, return true as a placeholder
    return true
  }
}
