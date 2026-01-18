import { v4 as uuidv4 } from "uuid"

import { getInstallationOctokit } from "@/lib/github"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
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
  /** GitHub login of the commenter. Required for API key lookup. */
  commenterLogin: string
}

async function isOrgAdmin({
  octokit,
  owner,
  username,
}: {
  octokit: Awaited<ReturnType<typeof getInstallationOctokit>>
  owner: string
  username: string
}): Promise<boolean> {
  try {
    // Only orgs support membership lookup; if not an org or not a member, this will throw
    const result = await octokit.rest.orgs.getMembershipForUser({
      org: owner,
      username,
    })
    // role: 'admin' | 'member'
    return result?.data?.role === "admin"
  } catch {
    // 404 or any error -> not an org admin
    return false
  }
}

/**
 * Handler: PR comment authorization gate and trigger for createDependentPR
 * - Only allows privileged actions when the commenter is an OWNER, or an org admin on an org-owned repo
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

  let authorized = authorAssociation === "OWNER"

  // If not repo OWNER, allow org admins on org-owned repos. We only attempt this
  // extra check when authorAssociation is MEMBER to avoid unnecessary API calls
  // and to keep existing unit-test mocks stable.
  if (!authorized && authorAssociation === "MEMBER") {
    const isAdmin = await isOrgAdmin({ octokit, owner, username: commenterLogin })
    authorized = isAdmin
  }

  if (!authorized) {
    // Non-owner attempting to trigger a workflow. Post a helpful reply.
    const reply =
      "Only repository owners or organization admins can trigger this workflow via PR comments. " +
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

  // Validate commenterLogin is present (should always be from webhook payload)
  const githubLogin = commenterLogin.trim()
  if (!githubLogin) {
    console.error(
      "[Webhook] commenterLogin is empty; cannot look up user settings"
    )
    return { status: "error", reason: "missing_commenter_login" as const }
  }

  // Verify the user has connected account and API key
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  const settingsUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/settings` : null

  let apiKeyResult: { ok: true; value: string | null } | { ok: false; error: string }
  try {
    const storage = new StorageAdapter(neo4jDs)
    apiKeyResult = await storage.settings.user.getOpenAIKey(githubLogin)
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

    // Generate UUID for workflow tracking
    const workflowId = uuidv4()
    const queue: QueueEnum = WORKFLOW_JOBS_QUEUE
    const jobId = await addJob(
      queue,
      {
        name: "createDependentPR",
        data: {
          workflowId,
          repoFullName,
          pullNumber: issueNumber,
          githubLogin,
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

    // Optional: add a rocket reaction to the original comment
    if (commentId) {
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
    }

    console.log(
      `[Webhook] PR comment authorized and job enqueued for ${repoFullName}#${issueNumber} by ${githubLogin} (workflow ID: ${workflowId})`
    )
    return { status: "enqueued" as const, jobId, workflowId }
  } catch (e) {
    console.error("[Webhook] Failed to enqueue createDependentPR job:", e)
    return { status: "error", reason: "enqueue_failed" as const }
  }
}

