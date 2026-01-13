import { getInstallationOctokit } from "@/lib/github"

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
}

/**
 * Handler: PR comment authorization gate (via author_association)
 * - Only allows privileged actions when the commenter is an OWNER
 * - For non-owners, responds with a helpful comment explaining the restriction
 * - For owners, confirms authorization with a reply
 * - Adds an emoji reaction to acknowledge the comment was received
 *
 * NOTE: This handler is intentionally conservative and does not execute any
 * workflows. It only enforces the authorization model and provides feedback.
 * Actual workflow execution (e.g. based on command text) should be added in a
 * follow-up once the specific commands are defined.
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

  // OWNER is authorized. Confirm with a simple reply.
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: "Authorization confirmed. You are authorized to trigger workflows.",
    })
  } catch (e) {
    console.error("[Webhook] Failed to post confirmation reply:", e)
  }

  console.log(
    `[Webhook] PR comment authorized by OWNER for ${repoFullName}#${issueNumber}`
  )
  return { status: "authorized" as const }
}
