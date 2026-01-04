import {
  getPullRequestDiscussionGraphQL,
  getPullRequestMetaAndLinkedIssue,
} from "@/shared/adapters/github/octokit/graphql/pullRequest.reader"

type PRMetaAndLinkedIssue = Awaited<
  ReturnType<typeof getPullRequestMetaAndLinkedIssue>
>
type PRDiscussion = Awaited<ReturnType<typeof getPullRequestDiscussionGraphQL>>

export function generatePRDataMessage(params: {
  repoFullName: string
  pullNumber: number
  workflowId: string
  workflowUrl: string | null
  initiator?: {
    type: "ui_button" | "webhook_label" | "api"
    actorLogin?: string
    label?: string
  }
  prMetaAndLinkedIssue: PRMetaAndLinkedIssue
  prDiscussion: PRDiscussion
  linkedIssue: PRMetaAndLinkedIssue["linkedIssue"]
  tree: string[]
  diff: string
}) {
  const {
    repoFullName,
    pullNumber,
    workflowId,
    workflowUrl,
    initiator,
    prMetaAndLinkedIssue,
    prDiscussion,
    linkedIssue,
    tree,
    diff,
  } = params

  const prUrl = `https://github.com/${repoFullName}/pull/${pullNumber}`
  const headRef = prMetaAndLinkedIssue.headRefName
  const baseRef = prMetaAndLinkedIssue.baseRefName
  const headSha = prMetaAndLinkedIssue.headRefOid
  const baseSha = prMetaAndLinkedIssue.baseRefOid
  const branchUrl = `https://github.com/${repoFullName}/tree/${headRef}`
  const headShaUrl = headSha
    ? `https://github.com/${repoFullName}/commit/${headSha}`
    : null
  const baseShaUrl = baseSha
    ? `https://github.com/${repoFullName}/commit/${baseSha}`
    : null

  const issueUrl =
    linkedIssue?.number != null
      ? `https://github.com/${repoFullName}/issues/${linkedIssue.number}`
      : null

  const initiatorLine = (() => {
    if (!initiator) return "initiated_by: (unknown)"
    if (initiator.type === "ui_button")
      return `initiated_by: ui_button${initiator.actorLogin ? ` (@${initiator.actorLogin})` : ""}`
    if (initiator.type === "webhook_label")
      return `initiated_by: webhook_label '${initiator.label || "unknown"}'${initiator.actorLogin ? ` (applied by @${initiator.actorLogin})` : ""}`
    return `initiated_by: api${initiator.actorLogin ? ` (@${initiator.actorLogin})` : ""}`
  })()

  const generalComments = prDiscussion.comments || []
  const reviews = prDiscussion.reviews || []
  const reviewLineComments = reviews.flatMap((r) => r.comments || [])

  const formatIndexLine = (label: string, text: string, url?: string | null) =>
    url ? `- ${label}: [${text}](${url})` : `- ${label}: ${text}`

  const commentIndexLines: string[] = []
  generalComments.forEach((c, idx) => {
    const label = `GC-${String(idx + 1).padStart(3, "0")}`
    const author = c.author?.login || "unknown"
    const when = c.createdAt || "unknown_time"
    commentIndexLines.push(
      formatIndexLine(
        label,
        `general comment by @${author} at ${when}`,
        c.url || prUrl
      )
    )
  })

  reviewLineComments.forEach((c, idx) => {
    const label = `RLC-${String(idx + 1).padStart(3, "0")}`
    const author = c.author?.login || "unknown"
    const when = c.createdAt || "unknown_time"
    const path = c.path || "unknown_file"
    commentIndexLines.push(
      formatIndexLine(
        label,
        `review line comment by @${author} on ${path} at ${when}`,
        c.url || prUrl
      )
    )
  })

  const generalCommentBodies = generalComments
    .map((c, idx) => {
      const label = `GC-${String(idx + 1).padStart(3, "0")}`
      const author = c.author?.login || "unknown"
      const when = c.createdAt || "unknown_time"
      const url = c.url || prUrl
      return [
        `### ${label}`,
        `author: @${author}`,
        `created_at: ${when}`,
        `url: ${url}`,
        ``,
        c.body || "",
      ].join("\n")
    })
    .join("\n\n")

  const reviewSummaries = reviews
    .map((r, idx) => {
      const label = `RV-${String(idx + 1).padStart(3, "0")}`
      const author = r.author?.login || "unknown"
      const when = r.submittedAt || "unknown_time"
      const state = r.state || "UNKNOWN"
      return [
        `### ${label}`,
        `author: @${author}`,
        `state: ${state}`,
        `submitted_at: ${when}`,
        ``,
        r.body || "(no review body)",
      ].join("\n")
    })
    .join("\n\n")

  const reviewLineCommentBodies = reviewLineComments
    .map((c, idx) => {
      const label = `RLC-${String(idx + 1).padStart(3, "0")}`
      const author = c.author?.login || "unknown"
      const when = c.createdAt || "unknown_time"
      const url = c.url || prUrl
      const path = c.path || "unknown_file"
      const hunk = c.diffHunk ? `\n\ndiff_hunk:\n${c.diffHunk}` : ""
      return [
        `### ${label}`,
        `author: @${author}`,
        `created_at: ${when}`,
        `path: ${path}`,
        `url: ${url}`,
        ``,
        c.body || "",
        hunk,
      ].join("\n")
    })
    .join("\n\n")

  const diffMax = 200_000
  const truncatedDiff =
    diff.length > diffMax ? `${diff.slice(0, diffMax)}\n... (truncated)` : diff

  return [
    `## PR_DATA`,
    ``,
    `repo: ${repoFullName}`,
    `pr: #${pullNumber}`,
    `pr_title: ${prMetaAndLinkedIssue.title || prDiscussion.pullRequest?.title || ""}`,
    `pr_url: ${prUrl}`,
    ``,
    `base_ref: ${baseRef}`,
    `head_ref: ${headRef}`,
    `branch_url: ${branchUrl}`,
    `base_sha: ${baseSha || ""}`,
    `base_sha_url: ${baseShaUrl || ""}`,
    `head_sha: ${headSha || ""}`,
    `head_sha_url: ${headShaUrl || ""}`,
    ``,
    `workflow_id: ${workflowId}`,
    `workflow_url: ${workflowUrl || ""}`,
    initiatorLine,
    ``,
    `## LINKED_ISSUE`,
    linkedIssue
      ? [
          `issue: #${linkedIssue.number}`,
          `issue_title: ${linkedIssue.title || ""}`,
          `issue_url: ${issueUrl || ""}`,
          ``,
          linkedIssue.body || "",
        ].join("\n")
      : `(none)`,
    ``,
    `## CURRENT_PR_BODY`,
    prMetaAndLinkedIssue.body || "(empty)",
    ``,
    `## DIRECTORY_TREE`,
    tree.join("\n"),
    ``,
    `## DIFF (TRUNCATED)`,
    "",
    truncatedDiff,
    "```",
    ``,
    `## DISCUSSION_LINK_INDEX (MARKDOWN_LINKS)`,
    commentIndexLines.length ? commentIndexLines.join("\n") : "- (none)",
    ``,
    `## GENERAL_COMMENTS (FULL_BODIES)`,
    generalCommentBodies || "(none)",
    ``,
    `## REVIEWS (FULL_BODIES)`,
    reviewSummaries || "(none)",
    ``,
    `## REVIEW_LINE_COMMENTS (FULL_BODIES)`,
    reviewLineCommentBodies || "(none)",
    ``,
  ].join("\n")
}
