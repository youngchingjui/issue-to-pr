import { v4 as uuidv4 } from "uuid"

import { getInstallationOctokit } from "@/lib/github"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"
import { addJob } from "@/shared/services/job"

// Trigger keyword to activate the workflow
const TRIGGER_KEYWORD = "@issuetopr"

interface HandlePullRequestReviewCommentProps {
  installationId: number
  commentId: number
  commentBody: string
  commentUserType: "User" | "Bot" | "Organization"
  authorAssociation: string
  pullNumber: number
  repoFullName: string
  commenterLogin: string
}

/**
 * Handler: PR review comment authorization gate and trigger for createDependentPR
 * Largely mirrors the PR issue_comment handler but uses the pull request review comment reactions API.
 */
export async function handlePullRequestReviewComment({
  installationId,
  commentId,
  commentBody,
  commentUserType,
  authorAssociation,
  pullNumber,
  repoFullName,
  commenterLogin,
}: HandlePullRequestReviewCommentProps) {
  if (commentUserType === "Bot") {
    return { status: "ignored", reason: "not_human_user" as const }
  }

  const trimmedBody = commentBody.trim()
  const looksLikeCommand = trimmedBody.toLowerCase().includes(TRIGGER_KEYWORD)
  if (!looksLikeCommand) {
    return { status: "ignored", reason: "no_command" as const }
  }

  const octokit = await getInstallationOctokit(installationId)
  const [owner, repo] = repoFullName.split("/")

  // Acknowledge with 👀
  try {
    await octokit.rest.reactions.createForPullRequestReviewComment({
      owner,
      repo,
      comment_id: commentId,
      content: "eyes",
    })
  } catch (e) {
    console.error("[Webhook] Failed to add reaction to review comment:", e)
  }

  const authorized =
    authorAssociation === "OWNER" ||
    authorAssociation === "MEMBER" ||
    authorAssociation === "COLLABORATOR"

  if (!authorized) {
    const reply =
      "Only repository owners, members, or collaborators can trigger this workflow via PR review comments. " +
      "Please ask an authorized user to run this workflow."

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: reply,
      })
    } catch (e) {
      console.error("[Webhook] Failed to post authorization reply:", e)
    }

    return { status: "rejected", reason: "not_owner" as const }
  }

  // Verify the user has connected account and API key
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  const settingsUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/settings` : null

  let apiKeyResult:
    | { ok: true; value: string | null }
    | { ok: false; error: string }
  try {
    const storage = new StorageAdapter(neo4jDs)
    apiKeyResult = await storage.settings.user.getOpenAIKey(commenterLogin)
  } catch (e) {
    console.error("[Webhook] Settings lookup failed:", e)
    return { status: "error", reason: "settings_lookup_failed" as const }
  }

  if (!apiKeyResult.ok) {
    const body =
      `Thanks for the request! It looks like you don't have an IssueToPR account yet. ` +
      `Please sign in to IssueToPR first to connect your GitHub account and add your LLM API key.` +
      (settingsUrl ? `\n\nGet started here: ${settingsUrl}` : "")

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      })
    } catch (e) {
      console.error("[Webhook] Failed to post account setup guidance:", e)
    }

    return { status: "rejected", reason: "user_not_found" as const }
  }

  if (!apiKeyResult.value) {
    const body =
      `Thanks for the request! To use IssueToPR from GitHub comments, please add your LLM API key in settings.` +
      (settingsUrl ? `\n\nAdd your key here: ${settingsUrl}` : "")

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      })
    } catch (e) {
      console.error("[Webhook] Failed to post settings guidance:", e)
    }

    return { status: "rejected", reason: "missing_api_key" as const }
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.error("[Webhook] REDIS_URL is not set; cannot enqueue job")
    return { status: "error", reason: "missing_redis_url" as const }
  }

  try {
    const workflowId = uuidv4()
    const queue = process.env.BULLMQ_QUEUE_NAME || WORKFLOW_JOBS_QUEUE
    const jobId = await addJob(
      queue,
      {
        name: "createDependentPR",
        data: {
          workflowId,
          repoFullName,
          pullNumber,
          githubLogin: commenterLogin,
          githubInstallationId: String(installationId),
        },
      },
      {},
      redisUrl
    )

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl =
      baseUrl && workflowId
        ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
        : null

    const reply =
      `Authorized. Queued dependent PR update for ${repoFullName}#${pullNumber}.` +
      (workflowUrl ? `\n\nTrack progress: ${workflowUrl}` : "")

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: reply,
    })

    try {
      await octokit.rest.reactions.createForPullRequestReviewComment({
        owner,
        repo,
        comment_id: commentId,
        content: "rocket",
      })
    } catch (e) {
      console.warn(
        "[Webhook] Failed to add rocket reaction on review comment:",
        e
      )
    }

    console.log(
      `[Webhook] PR review comment authorized and job enqueued for ${repoFullName}#${pullNumber} by ${commenterLogin} (workflow ID: ${workflowId})`
    )
    return { status: "enqueued" as const, jobId, workflowId }
  } catch (e) {
    console.error("[Webhook] Failed to enqueue createDependentPR job:", e)
    return { status: "error", reason: "enqueue_failed" as const }
  }
}
