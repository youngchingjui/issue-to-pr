import { getInstallationOctokit } from "."
import { getInstallationFromRepo } from "./repos"

/**
 * Retrieves the Github installation token for a given repo
 * Assumes the repo has the Github App installed to its owner account / org
 */
export async function getInstallationTokenFromRepo({
  owner,
  repo,
}: {
  owner: string
  repo: string
}) {
  const installation = await getInstallationFromRepo({ owner, repo })
  const installationOctokit = await getInstallationOctokit(installation.data.id)
  const auth = await installationOctokit.auth({ type: "installation" })

  // Narrow the `auth` value (it comes back as `unknown`) and ensure it has a
  // `token` property that is a string.  If any of these checks fail we bail out
  // early with a descriptive error so we never proceed with an invalid token
  // shape.
  if (
    !auth ||
    typeof auth !== "object" ||
    !("token" in auth) ||
    typeof auth.token !== "string"
  ) {
    throw new Error(
      `Invalid authentication response while trying to retrieve the installation token for ${owner + "/" + repo}: ${auth}`
    )
  }

  return auth.token
}

/**
 * Returns true if the authenticated user has at least one installation of the
 * Issue&nbsp;to&nbsp;PR GitHub App. Falls back to `false` on errors.
 */
export async function userHasAppInstallation(): Promise<boolean> {
  try {
    const { getUserInstallations } = await import("./index")
    const installations = await getUserInstallations()
    return Array.isArray(installations) && installations.length > 0
  } catch (err) {
    console.error("[github/installation] Failed to check installations", err)
    return false
  }
}
