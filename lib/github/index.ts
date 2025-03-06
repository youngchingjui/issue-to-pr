import { Octokit } from "@octokit/rest"
import * as fs from "fs"
import { App } from "octokit"

import { auth } from "@/auth"
import { getInstallationId } from "@/lib/utils-server"

function getPrivateKeyFromFile(): string {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return fs.readFileSync(privateKeyPath, "utf8")
}

export default async function getOctokit(): Promise<Octokit> {
  // Try to authenticate using user session
  const session = await auth()
  if (session?.token?.access_token) {
    return new Octokit({ auth: session.token.access_token })
  } else {
    // Fallback to GitHub App authentication
    // TODO: Uncomment this when shipping the project
    // const app = new App({
    //   appId: process.env.GITHUB_APP_ID,
    //   privateKey: getPrivateKeyFromFile(),
    // })

    // Assuming you have the installation ID from the webhook or other source
    const installationId = getInstallationId()

    if (!installationId) {
      console.log("No installation ID found")
      return null
    }

    return (await app.getInstallationOctokit(
      Number(installationId)
    )) as unknown as Octokit // Removes extra properties for pagination and retry capabilities
  }
}
