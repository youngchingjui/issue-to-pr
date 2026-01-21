import { v4 as uuidv4 } from "uuid"

import { getInstallationOctokit } from "@/lib/github"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"
import { addJob } from "@/shared/services/job"

// Trigger keyword to activate the workflow
const TRIGGER_KEYWORD = "@issuetopr"

interface HandlePullRequestCommentProps {
  installationId: number
  commentId: number
  commentBody: string
  commentUserType: "User" | "Bot" | "Organization"
  authorAssociation: string
  issueNumber: number
  repoFullName: string
  isPullRequest: boolean
  /** GitHub login of the commenter. Required for API key lookup. */
  commenterLogin: string
}

/**
 * Handler: PR comment authorization gate and trigger for createDependentPR
 * - Only allows privileged actions when the commenter is an OWNER, MEMBER, or COLLABORATOR
 * - If commenter lacks an API key in I2PR settings, posts guidance and exits
 * - If checks pass and comment mentions @issuetopr, enqueue createDependentPR job for workers
 * - Adds an emoji reaction to acknowledge the comment was received
 */
export async function handlePullRequestComment({
  installationId,
  commentId,
  commentBody,
  commentUserType,
  authorAssociation,
  issueNumber,
  repoFullName,
  isPullRequest,
  commenterLogin,
}: HandlePullRequestCommentProps) {
  // Only consider PR comments (issue_comment also fires for issues)
  if (!isPullRequest) {
    return { status: "ignored", reason: "not_pr_comment" as const }
  }

  // Only respond to human users to prevent bot loops
  if (commentUserType === "Bot") {
    return { status: "ignored", reason: "not_human_user" as const }
  }

  const trimmedBody = commentBody.trim()

  // Only react to explicit commands to avoid noisy replies.
  const looksLikeCommand = trimmedBody.toLowerCase().includes(TRIGGER_KEYWORD)
  if (!looksLikeCommand) {
    return { status: "ignored", reason: "no_command" as const }
  }

  // Create authenticated Octokit using the installation ID from the webhook
  const octokit = await getInstallationOctokit(installationId)
  const [owner, repo] = repoFullName.split("/")

  // Add an emoji reaction to acknowledge we've seen the comment
  let eyesReactionId: number | null = null
  try {
    const eyesReaction = await octokit.rest.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: commentId,
      content: "eyes",
    })
    eyesReactionId = eyesReaction.data.id
  } catch (e) {
    console.error("[Webhook] Failed to add reaction to comment:", e)
  }

  // Check if user has sufficient permission to trigger workflows
  // TODO: This should go through a matrix that's clear to developers to track what permissions are required for what actions.
  const authorized =
    authorAssociation === "OWNER" ||
    authorAssociation === "MEMBER" ||
    authorAssociation === "COLLABORATOR"

  if (!authorized) {
    // Unauthorized user attempting to trigger a workflow. Post a helpful reply.
    const reply =
      "Only repository owners, members, or collaborators can trigger this workflow via PR comments. " +
      "Please ask an authorized user to run this workflow."

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
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

  // Handle user not found in database
  if (!apiKeyResult.ok) {
    const body =
      `Thanks for the request! It looks like you don't have an IssueToPR account yet. ` +
      `Please sign in to IssueToPR first to connect your GitHub account and add your LLM API key.` +
      (settingsUrl ? `\n\nGet started here: ${settingsUrl}` : "")

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      })
    } catch (e) {
      console.error("[Webhook] Failed to post account setup guidance:", e)
    }

    return { status: "rejected", reason: "user_not_found" as const }
  }

  // Handle missing API key (user exists but hasn't configured it)
  if (!apiKeyResult.value) {
    const body =
      `Thanks for the request! To use IssueToPR from GitHub comments, please add your LLM API key in settings.` +
      (settingsUrl ? `\n\nAdd your key here: ${settingsUrl}` : "")

    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      })
    } catch (e) {
      console.error("[Webhook] Failed to post settings guidance:", e)
    }

    return { status: "rejected", reason: "missing_api_key" as const }
  }

  // Enqueue the createDependentPR job for workers to process
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.error("[Webhook] REDIS_URL is not set; cannot enqueue job")
    return { status: "error", reason: "missing_redis_url" as const }
  }

  try {
    // Thought: I think generally the workflowId should be generated by the workflow itself.
    // We'd have to reorg and refactor to make this work.
    // Likely have to have workflow event emitters, and another worker listening
    // So the listening worker can update github comments with progress.

    // Generate UUID for workflow tracking
    const workflowId = uuidv4()
    // Allow queue name override via env var for test isolation
    const queue = process.env.BULLMQ_QUEUE_NAME || WORKFLOW_JOBS_QUEUE
    const jobId = await addJob(
      queue,
      {
        name: "createDependentPR",
        data: {
          workflowId,
          repoFullName,
          pullNumber: issueNumber,
          githubLogin: commenterLogin,
          githubInstallationId: String(installationId),
        },
      },
      {},
      redisUrl
    )

    // Post confirmation with tracking link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl =
      baseUrl && workflowId
        ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
        : null

    const reply =
      `Authorized. Queued dependent PR update for ${repoFullName}#${issueNumber}.` +
      (workflowUrl ? `\n\nTrack progress: ${workflowUrl}` : "")

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: reply,
    })

    // Replace eyes reaction with rocket reaction
    if (eyesReactionId) {
      try {
        await octokit.rest.reactions.deleteForIssueComment({
          owner,
          repo,
          comment_id: commentId,
          reaction_id: eyesReactionId,
        })
      } catch (e) {
        console.warn("[Webhook] Failed to delete eyes reaction:", e)
      }
    }

    try {
      await octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: "rocket",
      })
    } catch (e) {
      // Non-critical: reaction is just visual feedback, don't fail the job
      console.warn("[Webhook] Failed to add rocket reaction:", e)
    }

    console.log(
      `[Webhook] PR comment authorized and job enqueued for ${repoFullName}#${issueNumber} by ${commenterLogin} (workflow ID: ${workflowId})`
    )
    return { status: "enqueued" as const, jobId, workflowId }
  } catch (e) {
    console.error("[Webhook] Failed to enqueue createDependentPR job:", e)
    return { status: "error", reason: "enqueue_failed" as const }
  }
}
