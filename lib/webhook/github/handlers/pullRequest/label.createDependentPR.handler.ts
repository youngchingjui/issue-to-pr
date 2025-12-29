import type { PullRequestPayload } from "@/lib/webhook/github/types"

/**
 * Handler: PR labeled with "I2PR: Update PR"
 * - For now, this is a no-op boundary that validates payload and logs receipt
 * - Actual job enqueueing will be added in a follow-up PR once worker schema supports it
 */
export async function handlePullRequestLabelCreateDependentPR({
  payload,
  installationId,
}: {
  payload: PullRequestPayload
  installationId: string
}) {
  const owner = payload.repository?.owner?.login
  const repo = payload.repository?.name
  const pullNumber = payload.number || payload.pull_request?.number
  const githubLogin = payload.sender?.login

  if (!owner || !repo || typeof pullNumber !== "number" || !githubLogin) {
    throw new Error(
      "Missing required fields for createDependentPR (owner, repo, pullNumber, sender.login)"
    )
  }

  const repoFullName = `${owner}/${repo}`

  // No-op: Log receipt and defer enqueueing to a later PR when worker is ready
  console.log(
    `[Webhook] Received PR label 'I2PR: Update PR' for ${repoFullName}#${pullNumber} by ${githubLogin}. Enqueue skipped (noop). installationId=${installationId}`
  )

  return {
    status: "noop",
    repoFullName,
    pullNumber,
    githubLogin,
    installationId,
  }
}

