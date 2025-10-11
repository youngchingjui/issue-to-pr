import { QueueEnum, WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"
import { addJob } from "shared/services/job"

import type { IssuesPayload } from "@/lib/webhook/github/types"

/**
 * Handler: Issue labeled with "I2PR: Resolve Issue"
 * - Enqueues the autoResolveIssue job onto the workflow-jobs queue
 * - Includes installation id and labeler login in job data
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

  await addJob(
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
}
