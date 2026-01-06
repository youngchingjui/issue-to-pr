import { createIssueComment } from "@/lib/github/issues"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import type { IssueCommentPayload } from "@/lib/webhook/github/types"

/**
 * Handler: PR comment authorization gate (via author_association)
 * - Only allows privileged actions when the commenter is an OWNER
 * - For non-owners, optionally responds with a helpful comment and exits
 *
 * NOTE: This handler is intentionally conservative and does not execute any
 * workflows. It only enforces the authorization model and provides feedback.
 * Actual workflow execution (e.g. based on command text) should be added in a
 * follow-up once the specific commands are defined.
 */
export async function handlePullRequestCommentAuthorize({
  payload,
  installationId,
}: {
  payload: IssueCommentPayload
  installationId: string
}) {
  const repoFullName = payload.repository?.full_name
  const issueNumber = payload.issue?.number
  const comment = payload.comment

  if (!repoFullName || typeof issueNumber !== "number" || !comment) {
    // Missing fields; ignore safely
    return { status: "ignored", reason: "missing_fields" as const }
  }

  // Only consider PR comments (issue_comment also fires for issues)
  // We detect this by the presence of issue.pull_request in the payload.
  const isPullRequestComment = Boolean(
    payload.issue && "pull_request" in payload.issue
  )
  if (!isPullRequestComment) {
    return { status: "ignored", reason: "not_pr_comment" as const }
  }

  const authorAssociation = comment.author_association || ""
  const body = (comment.body || "").trim()

  // Only react to explicit commands to avoid noisy replies.
  const looksLikeCommand = /^(?:\/?i2pr\b|i2pr:\b)/i.test(body)
  if (!looksLikeCommand) {
    return { status: "ignored", reason: "no_command" as const }
  }

  if (authorAssociation !== "OWNER") {
    // Non-owner attempting to trigger a workflow. Post a helpful reply using the
    // repository-linked installation to keep billing/auth tied to the repo.
    const reply =
      "Thanks for the request! For security, only repository owners can trigger this workflow via PR comments. " +
      "If you need this to run, please ask a repo owner to comment."

    // Ensure downstream GitHub API calls are authenticated for the repo installation
    runWithInstallationId(String(installationId), async () => {
      try {
        await createIssueComment({
          issueNumber,
          repoFullName,
          comment: reply,
        })
      } catch (e) {
        console.error("[Webhook] Failed to post authorization reply:", e)
      }
    })

    return { status: "rejected", reason: "not_owner" as const }
  }

  // OWNER is authorized. No-op for now; future implementation may dispatch
  // the requested workflow here.
  console.log(
    `[Webhook] PR comment authorized by OWNER for ${repoFullName}#${issueNumber}`
  )
  return { status: "authorized" as const }
}

