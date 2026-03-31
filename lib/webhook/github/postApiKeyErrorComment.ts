import { getInstallationOctokit } from "@/lib/github"

/**
 * Post an actionable GitHub issue comment when API key validation fails.
 * Used by webhook handlers to give users feedback on missing/invalid keys.
 */
export async function postApiKeyErrorComment({
  installationId,
  repoFullName,
  issueNumber,
  errorMessage,
}: {
  installationId: number
  repoFullName: string
  issueNumber: number
  errorMessage: string
}): Promise<void> {
  try {
    const octokit = await getInstallationOctokit(installationId)
    const [owner, repo] = repoFullName.split("/")
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const settingsUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/settings`
      : null
    const body =
      errorMessage +
      (settingsUrl ? `\n\nUpdate your settings here: ${settingsUrl}` : "")
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })
  } catch (e) {
    console.error("[Webhook] Failed to post API key error comment:", e)
  }
}
