import { QueueEnum, WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"
import { addJob } from "shared/services/job"

import { createIssueComment } from "@/lib/github/issues"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import type { IssuesPayload } from "@/lib/webhook/github/types"

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

/**
 * Handler: Issue labeled with "I2PR: Resolve Issue"
 * - Enqueues the autoResolveIssue job onto the workflow-jobs queue
 * - Includes installation id and labeler login in job data
 * - Posts a GitHub issue comment with a link to the workflow run and updates it as the job progresses
 */
export async function handleIssueLabelAutoResolve({
  payload,
  installationId,
}: {
  payload: IssuesPayload
  installationId: string
}) {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set")
  }

  const repoFullName = payload.repository?.full_name
  const issueNumber = payload.issue?.number
  const githubLogin = payload.sender?.login

  if (!repoFullName || typeof issueNumber !== "number" || !githubLogin) {
    throw new Error("Missing required fields for autoResolveIssue job")
  }

  const queue: QueueEnum = WORKFLOW_JOBS_QUEUE

  // Enqueue job and capture the job id
  const jobId = await addJob(
    queue,
    {
      name: "autoResolveIssue",
      data: {
        repoFullName,
        issueNumber,
        githubLogin,
        githubInstallationId: installationId,
      },
    },
    {},
    redisUrl
  )

  // Create initial status comment linking to the workflow run page if we have a job id
  if (jobId) {
    const link = `${getAppBaseUrl()}/workflow-runs/${jobId}`
    const body = [
      `[Issue to PR] Workflow queued for auto-resolve`,
      "",
      `Status: queued`,
      `Details: ${link}`,
      "",
      `<!-- workflow-run:${jobId} -->`,
    ].join("\n")

    // Use installation context to authenticate GitHub App API requests
    await runWithInstallationId(String(installationId), async () => {
      try {
        await createIssueComment({
          issueNumber,
          repoFullName,
          comment: body,
        })
      } catch (e) {
        console.error(
          "Failed to post initial workflow status comment:",
          e
        )
      }
    })
  }
}

