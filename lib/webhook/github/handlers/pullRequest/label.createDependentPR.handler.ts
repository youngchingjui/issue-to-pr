import { QueueEnum, WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"
import { addJob } from "shared/services/job"

import type { PullRequestPayload } from "@/lib/webhook/github/types"

/**
 * Handler: PR labeled with "I2PR: Update PR"
 * - Enqueues the createDependentPR job onto the workflow-jobs queue
 * - Includes installation id and labeler login in job data
 */
export async function handlePullRequestLabelCreateDependentPR({
  payload,
  installationId,
}: {
  payload: PullRequestPayload
  installationId: string
}) {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set")
  }

  const owner = payload.repository?.owner?.login
  const repo = payload.repository?.name
  const pullNumber = payload.number || payload.pull_request?.number
  const githubLogin = payload.sender?.login

  if (!owner || !repo || typeof pullNumber !== "number" || !githubLogin) {
    throw new Error(
      "Missing required fields for createDependentPR job (owner, repo, pullNumber, sender.login)"
    )
  }

  const repoFullName = `${owner}/${repo}`
  const queue: QueueEnum = WORKFLOW_JOBS_QUEUE

  await addJob(
    queue,
    {
      name: "createDependentPR",
      data: {
        repoFullName,
        pullNumber,
        githubLogin,
        githubInstallationId: installationId,
      },
    },
    {},
    redisUrl
  )
}

