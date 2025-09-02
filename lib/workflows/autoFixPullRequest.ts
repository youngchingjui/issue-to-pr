import { v4 as uuidv4 } from "uuid"

import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
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
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import { GitHubRepository } from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface Params {
  repoFullName: string
  pullNumber: number
  repository: GitHubRepository
  apiKey?: string
  jobId?: string
}

/**
 * Auto-fix a pull request by reading its diff, comments and reviews, and then
 * applying the requested fixes directly on the PR branch.
 *
 * The agent will:
 * - Checkout the PR head branch in a containerized workspace
 * - Inspect the repo tree and PR diff
 * - Read review comments and PR comments
 * - If available, also read the linked issue for additional context
 * - Make code changes, commit, and sync back to the PR branch
 */
export async function autoFixPullRequest({
  repoFullName,
  pullNumber,
  repository,
  apiKey,
  jobId,
}: Params) {
  if (!apiKey) {
    const key = await getUserOpenAIApiKey()
    if (!key) throw new Error("No API key provided and no user settings found")
    apiKey = key
  }

  const workflowId = jobId ?? uuidv4()

  try {
    // Initialize workflow run (link to underlying issue if found later)
    await initializeWorkflowRun({
      id: workflowId,
      type: "autoFixPullRequest",
      repoFullName,
      postToGithub: true,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting auto-fix workflow for ${repoFullName}#${pullNumber}`,
    })

    // Fetch PR details and artifacts
    const pr = await getPullRequest({ repoFullName, pullNumber })

    await createStatusEvent({
      workflowId,
      content: `Preparing containerized workspace on branch ${pr.head.ref}`,
    })

    // Speed up container clone by preparing a local mirror first
    const hostRepoPath = await setupLocalRepository({
      repoFullName,
      workingBranch: pr.head.ref,
    })

    const { containerName } = await createContainerizedWorkspace({
      repoFullName,
      branch: pr.head.ref,
      workflowId,
      hostRepoPath,
    })

    const env: RepoEnvironment = { kind: "container", name: containerName }

    const [owner, repo] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({ owner, repo })

    const trace = langfuse.trace({ name: "autoFixPullRequest" })
    const span = trace.span({ name: "PlanAndCodeAgent" })

    const agent = new PlanAndCodeAgent({
      apiKey,
      env,
      defaultBranch: repository.default_branch,
      repository,
      sessionToken,
      jobId: workflowId,
    })
    agent.addSpan({ span, generationName: "autoFixPullRequest" })

    // Collect context: directory tree, PR diff, comments & reviews
    const tree = await createContainerizedDirectoryTree(containerName)

    const diff = await getPullRequestDiff({ repoFullName, pullNumber })
    const comments = await getPullRequestComments({ repoFullName, pullNumber })
    const reviews = await getPullRequestReviews({ repoFullName, pullNumber })

    // Find linked issue (via closing keywords) for supplemental context
    const linkedIssues = await getLinkedIssuesForPR({
      repoFullName,
      pullNumber,
    })

    if (linkedIssues.length > 0) {
      try {
        const linkedIssueNumber = linkedIssues[0]
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber: linkedIssueNumber,
        })
        if (issueResult.type === "success") {
          await agent.addInput({
            role: "user",
            type: "message",
            content: `Linked GitHub issue #${issueResult.issue.number}\nTitle: ${issueResult.issue.title}\n\nDescription:\n${issueResult.issue.body ?? "(no description)"}`,
          })
        }
      } catch (e) {
        // non-fatal
        await createStatusEvent({
          workflowId,
          content: `Failed fetching linked issue context: ${String(e)}`,
        })
      }
    }

    // Primary instruction
    const instruction = `You are acting on an existing Pull Request. Your goal is to fix the PR based on the review comments and any outstanding issues raised in the discussion.

Constraints and requirements:
- Work directly on the PR head branch: ${pr.head.ref}. Do NOT create a new PR.
- Make minimal, targeted changes necessary to address the feedback and get the PR ready to merge.
- Use the available tools to modify files, run lint/type checks, commit, and sync the branch.
- Ensure all repository-defined linting/code-quality checks pass before syncing.
- If a check fails, update the code and re-run checks until they pass.
- When committing, write clear, concise commit messages that reference the changes.
`

    await agent.addInput({
      role: "user",
      type: "message",
      content: instruction,
    })

    // Provide repo tree and diff
    if (tree.length > 0) {
      await agent.addInput({
        role: "user",
        type: "message",
        content: `Repository directory tree (truncated):\n${tree.join("\n")}`,
      })
    }

    await agent.addInput({
      role: "user",
      type: "message",
      content: `Pull Request diff (unified):\n\n${diff}`,
    })

    // Provide comments and reviews
    if (comments.length > 0) {
      const formatted = comments
        .map(
          (c) =>
            `- ${c.user?.login ?? "unknown"} @ ${new Date(c.created_at).toLocaleString()}:\n${c.body}`
        )
        .join("\n\n")
      await agent.addInput({
        role: "user",
        type: "message",
        content: `Pull Request comments:\n${formatted}`,
      })
    }

    if (reviews.length > 0) {
      const formatted = reviews
        .map(
          (r) =>
            `- ${r.user?.login ?? "unknown"} (${r.state}) @ ${new Date(r.submitted_at ?? r.submitted_at ?? new Date().toISOString()).toLocaleString()}:\n${r.body ?? "(no comment)"}`
        )
        .join("\n\n")
      await agent.addInput({
        role: "user",
        type: "message",
        content: `Pull Request reviews:\n${formatted}`,
      })
    }

    await createStatusEvent({ workflowId, content: "Running auto-fix agent" })

    const result = await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })

    return result
  } catch (error) {
    await createErrorEvent({ workflowId, content: String(error) })
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  }
}

export default autoFixPullRequest

