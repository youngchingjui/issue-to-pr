import { v4 as uuidv4 } from "uuid"

import { getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import {
  GetIssueResult,
  GitHubIssue,
  IssueComment,
  PullRequestSingle,
} from "@/lib/types/github"

export type ResolveMergeConflictsParams = {
  repoFullName: string
  pullNumber: number
  jobId?: string
}

/**
 * Workflow to detect and prepare context for resolving PR merge conflicts.
 * - Detects whether the PR has merge conflicts (mergeable_state === "dirty" or mergeable === false)
 * - Finds the linked issue (if any)
 * - Fetches PR details, comments, and diff for display in the Workflow Runs UI
 *
 * This is a first step toward automated resolution; it surfaces all required
 * context so an agent can be plugged in in a follow-up iteration.
 */
export async function resolveMergeConflicts({
  repoFullName,
  pullNumber,
  jobId,
}: ResolveMergeConflictsParams) {
  const workflowId = jobId || uuidv4()

  // Try to associate a linked issue if present
  let linkedIssueNumber: number | undefined
  try {
    const linked = await getLinkedIssuesForPR({ repoFullName, pullNumber })
    if (linked.length > 0) {
      linkedIssueNumber = linked[0]
    }
  } catch {
    // Best-effort only
  }

  // Initialize the workflow run (linked to the issue if we found one)
  await initializeWorkflowRun({
    id: workflowId,
    type: "resolveMergeConflicts",
    issueNumber: linkedIssueNumber,
    repoFullName,
  })

  await createWorkflowStateEvent({ workflowId, state: "running" })
  await createStatusEvent({
    workflowId,
    content: `Starting merge-conflict workflow for ${repoFullName}#${pullNumber}`,
  })

  try {
    // 1) Fetch PR details (includes mergeable and mergeable_state on the single-PR REST API)
    const pr = (await getPullRequest({
      repoFullName,
      pullNumber,
    })) as PullRequestSingle

    const mergeable = pr.mergeable
    const mergeableState = pr.mergeable_state

    // 2) Fetch additional context
    const [comments, diff] = await Promise.all<[
      IssueComment[],
      string
    ]>([
      getPullRequestComments({ repoFullName, pullNumber }),
      getPullRequestDiff({ repoFullName, pullNumber }),
    ])

    // 3) If we have a linked issue, fetch it for display
    let issue: GitHubIssue | undefined
    if (linkedIssueNumber) {
      try {
        const issueResult: GetIssueResult = await getIssue({
          fullName: repoFullName,
          issueNumber: linkedIssueNumber,
        })
        if (issueResult.type === "success") {
          issue = issueResult.issue
        }
      } catch {
        // non-fatal
      }
    }

    // 4) Emit status events that the Workflow Runs UI can render
    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: mergeable_state=${mergeableState ?? "unknown"}, mergeable=${String(mergeable)}`,
    })

    if (issue) {
      await createStatusEvent({
        workflowId,
        content: `Linked issue #${issue.number}: ${issue.title ?? "(no title)"}`,
      })
    }

    await createStatusEvent({
      workflowId,
      content: `Comments: ${comments.length}, Diff length: ${diff.length.toLocaleString()} chars`,
    })

    if (mergeable === false || mergeableState === "dirty") {
      await createStatusEvent({
        workflowId,
        content:
          "Merge conflicts detected. You can now use the 'Resolve Merge Conflicts' action to attempt an automated resolution in a follow-up iteration.",
      })
    } else {
      await createStatusEvent({
        workflowId,
        content: "No merge conflicts detected for this PR.",
      })
    }

    await createWorkflowStateEvent({ workflowId, state: "completed" })

    return {
      success: true,
      data: {
        mergeable,
        mergeableState,
        commentsCount: comments.length,
        diffLength: diff.length,
        linkedIssueNumber,
      },
    }
  } catch (error) {
    await createStatusEvent({
      workflowId,
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
    })
    await createWorkflowStateEvent({ workflowId, state: "error" })
    throw error
  }
}

