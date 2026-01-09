import { getInstallationOctokit } from "@/lib/github";
import type { IssueCommentPayload } from "@/lib/webhook/github/types";

/**
 * Handler: On PR issue_comment created, if comment mentions our app handle,
 * add an :eyes: reaction to the original comment and post an acknowledgement reply.
 */
export async function handleIssueCommentAcknowledgeMention({
  payload,
  installationId,
}: {
  payload: IssueCommentPayload
  installationId: string
}) {
  try {
    const fullName = payload.repository?.full_name
    const issueNumber = payload.issue?.number
    const commentId = payload.comment?.id
    const commentBody = payload.comment?.body ?? ""

    if (!fullName || typeof issueNumber !== "number" || !commentId) {
      console.warn(
        "[Webhook] Missing repository/issue/comment data in issue_comment payload; skipping"
      )
      return { status: "invalid" as const }
    }

    // Ensure this is a PR comment (issue payload for PRs contains pull_request)
    const isPullRequest = typeof payload.issue?.pull_request !== "undefined"
    if (!isPullRequest) {
      return { status: "ignored:not_pr" as const }
    }

    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
    if (!appSlug) {
      console.warn(
        "[Webhook] NEXT_PUBLIC_GITHUB_APP_SLUG is not configured; cannot detect mentions"
      )
      return { status: "ignored:no_slug" as const }
    }

    const lowerBody = commentBody.toLowerCase()
    const slug = appSlug.toLowerCase()
    const botLogin = `${slug}[bot]`

    // Detect mention of either @slug or @slug[bot]
    const mentioned = lowerBody.includes(`@${slug}`) || lowerBody.includes(`@${botLogin}`)
    if (!mentioned) {
      return { status: "ignored:no_mention" as const }
    }

    // Parse owner/repo from full_name
    const [owner, repo] = fullName.split("/")
    if (!owner || !repo) {
      console.warn(
        `[Webhook] Invalid repository.full_name '${fullName}'; skipping`
      )
      return { status: "invalid" as const }
    }

    const octokit = await getInstallationOctokit(Number(installationId))

    // Add :eyes: reaction to the original comment
    try {
      await octokit.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: "eyes",
      })
    } catch (e) {
      console.warn(
        `[Webhook] Failed to add :eyes: reaction to comment ${commentId} on ${fullName}:`,
        e
      )
      // Continue; reaction failure shouldn't block acknowledgement comment
    }

    const commenter = payload.comment?.user?.login
    const ackBody = commenter
      ? `👀 Thanks for the mention, @${commenter}! We received your comment and our GitHub App has seen the event.`
      : `👀 Thanks for the mention! We received your comment and our GitHub App has seen the event.`

    // Post acknowledgement comment on the PR thread (issues namespace for PRs)
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: ackBody,
    })

    console.log(
      `[Webhook] Acknowledged mention for ${fullName}#${issueNumber} (comment ${commentId})`
    )

    return { status: "ok" as const }
  } catch (error) {
    console.error("[ERROR] Error in handleIssueCommentAcknowledgeMention:", error)
    return { status: "error" as const }
  }
}

