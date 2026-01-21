import { v4 as uuidv4 } from "uuid"

import { getInstallationOctokit } from "@/lib/github"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"
import { addJob } from "@/shared/services/job"

// Trigger keyword to activate the workflow
const TRIGGER_KEYWORD = "@issuetopr"

interface HandlePullRequestReviewProps {
  installationId: number
  reviewId: number
  reviewBody: string | null | undefined
  reviewUserType: "User" | "Bot" | "Organization"
  authorAssociation: string
  pullNumber: number
  repoFullName: string
  /** GitHub login of the reviewer. Required for API key lookup. */
  reviewerLogin: string
}

/**
 * Handler: PR review authorization gate and trigger for createDependentPR
 * - Only allows privileged actions when the reviewer is an OWNER, MEMBER, or COLLABORATOR
 * - Requires reviewer to have an API key configured on IssueToPR
 * - If checks pass and review mentions @issuetopr, enqueue createDependentPR job
 * - Posts a PR comment with a tracking link
 */
export async function handlePullRequestReview({
  installationId,
  reviewId,
  reviewBody,
  reviewUserType,
  authorAssociation,
  pullNumber,
  repoFullName,
  reviewerLogin,
}: HandlePullRequestReviewProps) {
  // Only respond to human users to prevent bot loops
  if (reviewUserType === "Bot") {
    return { status: "ignored", reason: "not_human_user" as const }
  }

  const body = (reviewBody || "").trim()
  const looksLikeCommand = body.toLowerCase().includes(TRIGGER_KEYWORD)
  if (!looksLikeCommand) {
    return { status: "ignored", reason: "no_command" as const }
  }

  const octokit = await getInstallationOctokit(installationId)
  const [owner, repo] = repoFullName.split("/")

  const authorized =
    authorAssociation === "OWNER" ||
    authorAssociation === "MEMBER" ||
    authorAssociation === "COLLABORATOR"

  if (!authorized) {
    // Unauthorized reviewer attempting to trigger a workflow. Post a helpful reply on the PR.
    const reply =
      "Only repository owners, members, or collaborators can trigger this workflow via PR reviews. " +
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
    apiKeyResult = await storage.settings.user.getOpenAIKey(reviewerLogin)
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
      `Thanks for the request! To use IssueToPR from GitHub reviews, please add your LLM API key in settings.` +
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
          githubLogin: reviewerLogin,
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

    console.log(
      `[Webhook] PR review authorized and job enqueued for ${repoFullName}#${pullNumber} by ${reviewerLogin} (workflow ID: ${workflowId})`
    )
    return { status: "enqueued" as const, jobId, workflowId }
  } catch (e) {
    console.error("[Webhook] Failed to enqueue createDependentPR job:", e)
    return { status: "error", reason: "enqueue_failed" as const }
  }
}

