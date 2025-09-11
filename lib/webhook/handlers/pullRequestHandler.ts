import { listContainersByLabels, stopAndRemoveContainer } from "@/lib/docker"

import { GitHubEvent, PullRequestPayload, WebhookHandler } from "../types"

export class PullRequestHandler implements WebhookHandler<PullRequestPayload> {
  canHandle(event: string, payload: PullRequestPayload): boolean {
    return event === GitHubEvent.PullRequest
  }

  async handle(event: string, payload: PullRequestPayload): Promise<void> {
    const action = payload.action

    // We only care when a PR is closed AND merged
    if (action === "closed" && payload.pull_request?.merged) {
      await this.handleMergedPullRequest(payload)
    }
  }

  private async handleMergedPullRequest(
    payload: PullRequestPayload
  ): Promise<void> {
    try {
      const repo = payload.repository?.name
      const owner = payload.repository?.owner?.login
      const branch = payload.pull_request?.head?.ref

      if (!repo || !owner || !branch) {
        console.warn(
          "[Webhook] Missing repo/owner/branch in pull_request payload; skipping container cleanup"
        )
        return
      }

      // Find containers created for this PR branch via labels. Also require preview=true for safety.
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

      await Promise.all(
        containerNames.map((name) => stopAndRemoveContainer(name))
      )

      console.log(
        `[Webhook] Cleaned up ${containerNames.length} container(s) for merged PR ${owner}/${repo}@${branch}`
      )
    } catch (e) {
      console.error("[Webhook] Failed to clean up containers on PR merge:", e)
    }
  }
}
