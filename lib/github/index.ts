import { Octokit } from "@octokit/rest"

import { auth } from "@/auth"

export default async function getOctokit(): Promise<Octokit> {
  const session = await auth()
  if (!session?.user) {
    throw new Error("User not found")
  }

  const accessToken = session.user.accessToken
  if (!accessToken) {
    throw new Error("Access token not found")
  }

  return new Octokit({ auth: accessToken })
}
