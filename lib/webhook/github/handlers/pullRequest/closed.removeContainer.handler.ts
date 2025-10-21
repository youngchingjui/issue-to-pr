import { listContainersByLabels, stopAndRemoveContainer } from "@/lib/docker"
import type { PullRequestPayload } from "@/lib/webhook/github/types"

/**
 * Handler: Pull request closed (merged)
 * - Cleans up any preview containers associated with the PR branch
 */
export async function handlePullRequestClosedRemoveContainer({
  payload,
}: {
  payload: PullRequestPayload
}) {
  const repo = payload.repository?.name
  const owner = payload.repository?.owner?.login
  const branch = payload.pull_request?.head?.ref

  if (!repo || !owner || !branch) {
    console.warn(
      "[Webhook] Missing repo/owner/branch in pull_request payload; skipping container cleanup"
    )
    return
  }

  const containerNames = await listContainersByLabels({
    preview: "true",
    owner,
    repo,
    branch,
  })

  if (!containerNames.length) {
    console.log(
      `[Webhook] No matching containers found for ${owner}/${repo}@${branch}`
    )
    return
  }

  const unique = [...new Set(containerNames)]
  const results = await Promise.allSettled(
    unique.map((name) => stopAndRemoveContainer(name))
  )
  const failed = results.filter((r) => r.status === "rejected").length
  if (failed) {
    console.warn(
      `[Webhook] ${failed} container cleanup(s) failed for ${owner}/${repo}@${branch}`
    )
  }

  console.log(
    `[Webhook] Cleaned up ${unique.length - failed} container(s) for merged PR ${owner}/${repo}@${branch}`
  )
}
