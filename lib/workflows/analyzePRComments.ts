import { v4 as uuidv4 } from "uuid"

import { createIssueComment, getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestReviewCommentsGraphQL,
} from "@/lib/github/pullRequests"
import {
  createErrorEvent,
  createLLMResponseEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { AnthropicAdapter, analyzePRAndProposeIssueUpdates } from "@/shared/src"

interface AnalyzePRCommentsParams {
  repoFullName: string
  pullNumber: number
  jobId?: string
  anthropicApiKey?: string
}

export async function analyzePRCommentsWorkflow({
  repoFullName,
  pullNumber,
  jobId,
  anthropicApiKey,
}: AnalyzePRCommentsParams): Promise<void> {
  const workflowId = jobId || uuidv4()

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "analyzePRComments",
      repoFullName,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Fetching PR #${pullNumber} details and comments`,
    })

    const [pr, generalComments, reviewNodes, linkedIssues] = await Promise.all([
      getPullRequest({ repoFullName, pullNumber }),
      getPullRequestComments({ repoFullName, pullNumber }),
      getPullRequestReviewCommentsGraphQL({ repoFullName, pullNumber }),
      getLinkedIssuesForPR({ repoFullName, pullNumber }),
    ])

    if (!linkedIssues.length) {
      await createStatusEvent({
        workflowId,
        content: "No linked issues found for this PR. Skipping analysis.",
      })
      await createWorkflowStateEvent({ workflowId, state: "completed" })
      return
    }

    // For now, handle the first linked issue
    const issueNumber = linkedIssues[0]
    const issueRes = await getIssue({ fullName: repoFullName, issueNumber })
    if (issueRes.type !== "success") {
      await createStatusEvent({
        workflowId,
        content: `Linked issue #${issueNumber} not accessible (${issueRes.type}).`,
      })
      await createWorkflowStateEvent({ workflowId, state: "error" })
      return
    }

    // Flatten review comments
    const reviewComments = (reviewNodes || []).flatMap((r) =>
      (r.comments || []).map((c) => ({
        author: c.author,
        body: c.body,
        file: c.file,
        diffHunk: c.diffHunk,
        createdAt: c.createdAt,
      }))
    )

    // Prepare LLM adapter and input
    const llm = new AnthropicAdapter(anthropicApiKey || process.env.ANTHROPIC_API_KEY)

    const analysis = await analyzePRAndProposeIssueUpdates(llm, {
      repoFullName,
      pullNumber,
      prTitle: pr.title,
      prBody: pr.body ?? undefined,
      issue: {
        repoFullName,
        number: issueNumber,
        title: issueRes.issue.title ?? undefined,
        body: issueRes.issue.body ?? undefined,
      },
      generalComments: generalComments.map((c) => ({
        author: c.user?.login,
        body: c.body || "",
        createdAt: c.created_at,
      })),
      reviewComments,
      model: "claude-3-5-sonnet-latest",
    })

    await createLLMResponseEvent({
      workflowId,
      content: analysis.suggestedIssueUpdateMarkdown,
      model: "claude-3-5-sonnet-latest",
    })

    await createStatusEvent({
      workflowId,
      content: `Posting proposed updates to Issue #${issueNumber}`,
    })

    const commentBody = [
      `PR #${pullNumber} Review-driven Issue Update Proposal`,
      "",
      analysis.suggestedIssueUpdateMarkdown,
    ].join("\n")

    await createIssueComment({
      repoFullName,
      issueNumber,
      comment: commentBody,
    })

    await createWorkflowStateEvent({ workflowId, state: "completed" })
  } catch (error) {
    await createErrorEvent({
      workflowId,
      content: String(error),
    })
    await createWorkflowStateEvent({ workflowId, state: "error" })
    throw error
  }
}

export default analyzePRCommentsWorkflow

