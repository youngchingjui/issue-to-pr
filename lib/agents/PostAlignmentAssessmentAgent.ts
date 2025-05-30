import { createIssueComment, getIssueComments } from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

/**
 * Format the alignment assessment output as a comment for a GitHub PR and post it.
 * @param alignmentResult AlignmentAgent's output (JSON|string)
 * @param repoFullName The full name of the repo (owner/repo)
 * @param pullNumber The PR number
 * @param workflowId Trace/workflow ID (for review URL)
 */
export async function postAlignmentAssessment({
  alignmentResult,
  repoFullName,
  pullNumber,
  workflowId,
  baseUrl = "https://issuetopr.dev",
}: {
  alignmentResult: string | object
  repoFullName: string
  pullNumber: number
  workflowId: string
  baseUrl?: string
}) {
  // Avoid duplicate comments: If already commented for this workflowId, skip (debounce)
  const existingComments = await getIssueComments({
    repoFullName,
    issueNumber: pullNumber,
  })
  const alreadyCommented = existingComments.find((c) =>
    c.body?.includes(`[AlignmentAssessment][${workflowId}]`)
  )
  if (alreadyCommented) {
    // Don't post duplicate comment
    return { status: "skipped", reason: "Already commented for this workflow" }
  }

  // Parse alignmentResult if necessary
  let parsed: any = alignmentResult
  if (typeof alignmentResult === "string") {
    try {
      parsed = JSON.parse(alignmentResult)
    } catch (e) {
      // fallback: treat as string
      parsed = { message: alignmentResult }
    }
  }

  // Compose workflow run/review URL
  const reviewUrl = `${baseUrl}/workflow-runs/${workflowId}`
  const prUrl = `https://github.com/${repoFullName}/pull/${pullNumber}`

  // Format the comment
  let comment = `### Alignment Assessment\n\n[View alignment workflow run](${reviewUrl})\n\n[AlignmentAssessment][${workflowId}]\n\n`
  if (parsed.inconsistencies && Array.isArray(parsed.inconsistencies) && parsed.inconsistencies.length > 0) {
    comment += `Alignment Check for [this PR](${prUrl}).\n\n#### Inconsistencies\n`
    parsed.inconsistencies.forEach((inc: any, idx: number) => {
      const reviewer = inc.comment?.author ? inc.comment.author : "Unknown reviewer"
      const where = inc.rootCause || "Ambiguous"
      const summary = inc.comment?.text || inc.comment || "(No comment text)"
      const explanation = inc.explanation || "(No explanation given)"
      // Guidance:
      let nextStep = "Review and update as needed."
      if (where === "Plan") nextStep = "Update the plan."
      else if (where === "Issue") nextStep = "Update the issue."
      else if (where === "Implementation") nextStep = "Update the implementation (PR/code)."
      else if (where === "Ambiguous") nextStep = "Clarify details in issue or plan."
      comment += `- **Reviewer**: ${reviewer}\n- **Where**: ${where}\n- **Summary**: ${summary}\n- **Explanation**: ${explanation}\n- **Next step**: ${nextStep}\n\n`
    })
    comment += `[Full review details & context](${reviewUrl})`
  } else if (parsed.message && parsed.message.match(/no inconsistencies|no comments/i)) {
    comment += `✅ No inconsistencies found. [Full review details](${reviewUrl})`
  } else {
    comment += `Alignment assessment did not return expected results. Please [view details in the workflow run](${reviewUrl}).`
  }

  // Post the comment to the PR (PRs are issues in GitHub API)
  try {
    await createIssueComment({
      issueNumber: pullNumber,
      repoFullName,
      comment,
    })
    return { status: "posted" }
  } catch (err) {
    // Defensive logging only
    console.error("Failed to post alignment assessment comment", err)
    return { status: "error", error: err }
  }
}
