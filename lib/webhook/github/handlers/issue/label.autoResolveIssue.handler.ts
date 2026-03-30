import { neo4jDs } from "@/lib/neo4j"
import { postApiKeyErrorComment } from "@/lib/webhook/github/postApiKeyErrorComment"
import type { IssuesPayload } from "@/lib/webhook/github/types"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { QueueEnum, WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"
import { addJob } from "@/shared/services/job"
import {
  checkProviderSupported,
  resolveApiKey,
} from "@/shared/services/resolveApiKey"

/**
 * Handler: Issue labeled with "I2PR: Resolve Issue"
 * - Validates user API key (provider-aware) before enqueueing
 * - Posts GitHub comment on validation failure
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

  // Pre-queue validation: check the user has a valid API key for a supported provider
  const storage = new StorageAdapter(neo4jDs)
  const resolved = await resolveApiKey(storage.settings.user, githubLogin)
  const unsupported = resolved.ok
    ? checkProviderSupported(resolved.provider)
    : null
  if (!resolved.ok || unsupported) {
    const errorMessage = resolved.ok ? unsupported! : resolved.error
    await postApiKeyErrorComment({
      installationId: Number(installationId),
      repoFullName,
      issueNumber,
      errorMessage,
    })
    return
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
