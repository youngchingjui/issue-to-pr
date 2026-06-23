import { getInstallationFromRepo } from "./repos"

/**
 * Checks whether the Issue-to-PR GitHub App is installed for the given repository.
 * Returns true when installed, false when not installed or when the check fails
 * with a 404 from GitHub. Other errors are logged and treated as not installed
 * to avoid breaking the UX.
 */
export async function isAppInstalledForRepo({
  owner,
  repo,
}: {
  owner: string
  repo: string
}): Promise<boolean> {
  try {
    await getInstallationFromRepo({ owner, repo })
    return true
  } catch (error: unknown) {
    // Octokit errors expose a numeric `status` code
    const status = (error as { status?: number })?.status
    if (status === 404) {
      return false
    }
    console.error(
      `[github/install-check] Failed to determine installation for ${owner}/${repo}:`,
      error
    )
    return false
  }
}

