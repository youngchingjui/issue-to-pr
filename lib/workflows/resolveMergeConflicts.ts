import { v4 as uuidv4 } from "uuid"

import { ReviewerAgent } from "@/lib/agents/reviewer"
import { createDirectoryTree } from "@/lib/fs"
import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import {
  GitHubIssue,
  IssueComment,
  PullRequestReview,
  PullRequestSingle,
} from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface Params {
  repoFullName: string
  pullNumber: number
  apiKey: string
  jobId?: string
}

/**
 * Resolve merge conflicts workflow
 * - Detects merge conflict status for a PR
 * - Gathers context for the LLM: linked issue(s), PR comments, reviews, diff, repo tree
 * - Produces an analysis to guide automatic resolution (future step)
 */
export async function resolveMergeConflicts({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: Params) {
  const workflowId = jobId || uuidv4()

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "resolveMergeConflicts",
      issueNumber: undefined,
      repoFullName,
      postToGithub: false,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    // Start trace
    const trace = langfuse.trace({
      name: `Resolve merge conflicts for PR#${pullNumber}`,
      input: { repoFullName, pullNumber },
    })
    const span = trace.span({ name: "resolveMergeConflicts" })

    // Fetch PR and mergeability
    await createStatusEvent({ workflowId, content: "Fetching PR details" })
    const pr = (await getPullRequest({
      repoFullName,
      pullNumber,
    })) as unknown as PullRequestSingle

    await createStatusEvent({
      workflowId,
      content: `PR mergeable: ${String(pr.mergeable)} | state: ${pr.mergeable_state}`,
    })

    // Fetch linked issues (via closing keywords)
    const linkedIssueNumbers = await getLinkedIssuesForPR({
      repoFullName,
      pullNumber,
    })

    let linkedIssues: GitHubIssue[] = []
    if (linkedIssueNumbers.length > 0) {
      await createStatusEvent({
        workflowId,
        content: `Found linked issue(s): ${linkedIssueNumbers.join(", ")}`,
      })
      for (const issueNumber of linkedIssueNumbers) {
        const res = await getIssue({ fullName: repoFullName, issueNumber })
        if (res.type === "success") linkedIssues.push(res.issue)
      }
    } else {
      await createStatusEvent({
        workflowId,
        content: "No linked issues found for this PR",
      })
    }

    // Get PR diff, comments, reviews
    await createStatusEvent({ workflowId, content: "Fetching PR diff" })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

    await createStatusEvent({ workflowId, content: "Fetching PR comments" })
    const comments: IssueComment[] = await getPullRequestComments({
      repoFullName,
      pullNumber,
    })

    await createStatusEvent({ workflowId, content: "Fetching PR reviews" })
    const reviews: PullRequestReview[] = await getPullRequestReviews({
      repoFullName,
      pullNumber,
    })

    // Setup local repo and tools for context
    await createStatusEvent({
      workflowId,
      content: "Setting up local repository and tools",
    })

    const repo = await getRepoFromString(repoFullName)
    const baseDir = await setupLocalRepository({
      repoFullName,
      workingBranch: repo.default_branch,
    })

    const tree = await createDirectoryTree(baseDir || "")

    // Initialize an LLM to analyze conflict context (uses ReviewerAgent for now)
    const getFileContentTool = createGetFileContentTool(baseDir || "")
    const searchCodeTool = createRipgrepSearchTool(repoFullName)

    const agent = new ReviewerAgent({ apiKey })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "resolve-merge-conflicts" })

    const formattedComments = comments
      .map(
        (c, i) => `Comment ${i + 1} by ${c.user?.login ?? "unknown"}:\n${c.body}`
      )
      .join("\n\n")

    const formattedReviews = reviews
      .map(
        (r, i) =>
          `Review ${i + 1} by ${r.user?.login ?? "unknown"} (${r.state}):\n${r.body || "No comment"}`
      )
      .join("\n\n")

    const linkedIssuesSection =
      linkedIssues.length > 0
        ? linkedIssues
            .map(
              (iss) =>
                `- #${iss.number} ${iss.title}\n${iss.body ? iss.body : ""}`
            )
            .join("\n\n")
        : "None"

    const message = `You are assisting with resolving merge conflicts for a pull request.`
      + `\n\nRepo: ${repoFullName}`
      + `\nPR #${pullNumber}: ${pr.title}`
      + `\nPR URL: ${pr.html_url}`
      + `\nPR mergeable: ${String(pr.mergeable)} | state: ${pr.mergeable_state}`
      + `\n\nLinked issues:\n${linkedIssuesSection}`
      + `\n\nRepository directory tree:\n${tree.join("\n")}`
      + (formattedComments ? `\n\nPR Comments:\n${formattedComments}\n` : "")
      + (formattedReviews ? `\n\nPR Reviews:\n${formattedReviews}\n` : "")
      + `\n\nPull request diff:\n${diff}`
      + `\n\nInstructions:`
      + `\n- Identify likely conflicting sections in the diff (look for overlapping edits with base).`
      + `\n- Propose concrete code edits to resolve conflicts while preserving the intent of the PR and linked issues.`
      + `\n- If needed, request specific file contents using the available tools to fully resolve conflicts.`
      + `\n- Output a concise plan and the exact patches to apply.`

    await agent.addMessage({ role: "user", content: message })

    agent.addTool(getFileContentTool)
    agent.addTool(searchCodeTool)

    await createStatusEvent({
      workflowId,
      content: "Starting merge conflict analysis",
    })

    const response = await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })

    return response
  } catch (error) {
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  }
}

export default resolveMergeConflicts

