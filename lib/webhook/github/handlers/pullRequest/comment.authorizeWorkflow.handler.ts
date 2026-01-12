import { getInstallationOctokit } from "@/lib/github"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { makeSettingsReaderAdapter } from "@/shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { QueueEnum, WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"
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
  commenterLogin?: string
}

/**
 * Handler: PR comment authorization gate and trigger for createDependentPR
 * - Only allows privileged actions when the commenter is an OWNER
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
  if (commentId) {
    try {
      await octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: "eyes",
      })
    } catch (e) {
      console.error("[Webhook] Failed to add reaction to comment:", e)
    }
  }

  if (authorAssociation !== "OWNER") {
    // Non-owner attempting to trigger a workflow. Post a helpful reply.
    const reply =
      "Only repository owners can trigger this workflow via PR comments. " +
      "Please ask the repo owner to run this workflow."

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

  const githubLogin = commenterLogin || undefined

  // Verify the user has connected account and API key
  let hasApiKey = false
  let settingsUrl: string | null = null
  try {
    const settingsReader = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession("READ"),
      userRepo,
    })
    if (githubLogin) {
      const apiKeyRes = await settingsReader.getOpenAIKey(githubLogin)
      hasApiKey = !!(apiKeyRes.ok && apiKeyRes.value)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    settingsUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/settings` : null
  } catch (e) {
    console.error("[Webhook] Settings lookup failed:", e)
  }

  if (!hasApiKey) {
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
    const queue: QueueEnum = WORKFLOW_JOBS_QUEUE
    const jobId = await addJob(
      queue,
      {
        name: "createDependentPR",
        data: {
          repoFullName,
          pullNumber: issueNumber,
          githubLogin: githubLogin || "",
          githubInstallationId: String(installationId),
        },
      },
      {},
      redisUrl
    )

    // Post confirmation with tracking link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl =
      baseUrl && jobId
        ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${jobId}`
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

    // Optional: add a rocket reaction to the original comment
    if (commentId) {
      try {
        await octokit.rest.reactions.createForIssueComment({
          owner,
          repo,
          comment_id: commentId,
          content: "rocket",
        })
      } catch {}
    }

    console.log(
      `[Webhook] PR comment authorized and job enqueued for ${repoFullName}#${issueNumber} by ${githubLogin}`
    )
    return { status: "enqueued" as const, jobId }
  } catch (e) {
    console.error("[Webhook] Failed to enqueue createDependentPR job:", e)
    return { status: "error", reason: "enqueue_failed" as const }
  }
}
