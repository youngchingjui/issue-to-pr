import { Octokit } from "@octokit/rest"
import { App } from "octokit"

import { auth } from "@/auth"
import { getInstallationId } from "@/lib/utils-server"

export default async function getOctokit(): Promise<Octokit> {
  // Try to authenticate using user session
  const session = await auth()
  if (session?.user?.accessToken) {
    return new Octokit({ auth: session.user.accessToken })
  }

  // Fallback to GitHub App authentication
  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
  })

  // Assuming you have the installation ID from the webhook or other source
  const installationId = getInstallationId()

  return (await app.getInstallationOctokit(
    Number(installationId)
  )) as unknown as Octokit // Removes extra properties for pagination and retry capabilities
}
