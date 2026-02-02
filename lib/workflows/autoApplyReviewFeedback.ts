import { v4 as uuidv4 } from "uuid"

import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import { getAuthToken } from "@/lib/github"
import { getRepoFromString } from "@/lib/github/content"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import {
  GitHubIssue,
  GitHubRepository,
  RepoPermissions,
} from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

import { getIssue } from "@/lib/github/issues"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

interface Params {
  repoFullName: string
  pullNumber: number
  apiKey?: string
  jobId?: string
}

/**
 * Workflow: Automatically apply pull-request review feedback.
 *
 * 1. Collect the PR diff, review comments, and general comments.
 * 2. Fetch any linked GitHub issues (via closing keywords) for additional context.
 * 3. Spin up a containerised workspace checked-out to the PR branch.
 * 4. Run a PlanAndCodeAgent with all gathered context so it can implement the
 *    requested changes, commit, and push them to the same branch.
 */
export const autoApplyReviewFeedback = async ({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: Params) => {
  if (!apiKey) {
    const apiKeyFromSettings = await getUserOpenAIApiKey()

    if (!apiKeyFromSettings) {
      throw new Error("No API key provided and no user settings found")
    }

    apiKey = apiKeyFromSettings
  }

  const workflowId = jobId ?? uuidv4()
  let userPermissions: RepoPermissions | null = null

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "autoApplyReviewFeedback",
      repoFullName,
      postToGithub: true,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting workflow to auto-apply review feedback for PR #${pullNumber}`,
    })

    // --------------------------------------------------
    // 1. Collect PR metadata, diff, comments, reviews
    // --------------------------------------------------
    const pullRequest = await getPullRequest({
      repoFullName,
      pullNumber,
    })

    const prBranch = pullRequest.head.ref
    const repository: GitHubRepository = await getRepoFromString(repoFullName)

    // Comments / reviews
    const [comments, reviews] = await Promise.all([
      getPullRequestComments({ repoFullName, pullNumber }),
      getPullRequestReviews({ repoFullName, pullNumber }),
    ])

    // Format comments/reviews for the agent prompt
    const formattedComments = comments
      .map(
        (c, idx) =>
          `Comment ${idx + 1} by ${c.user?.login} at ${new Date(
            c.created_at
          ).toLocaleString()}\n\n${c.body}`
      )
      .join("\n\n")

    const formattedReviews = reviews
      .map(
        (r, idx) =>
          `Review ${idx + 1} by ${r.user?.login} (${r.state}) at ${new Date(
            r.submitted_at || r.submitted_at || Date.now()
          ).toLocaleString()}\n\n${r.body || "(no top-level comment)"}`
      )
      .join("\n\n")

    // --------------------------------------------------
    // 2. Fetch linked issues (if any)
    // --------------------------------------------------
    const linkedIssueNumbers = await getLinkedIssuesForPR({
      repoFullName,
      pullNumber,
    })

    const linkedIssues: GitHubIssue[] = []
    for (const issueNumber of linkedIssueNumbers) {
      const res = await getIssue({ fullName: repoFullName, issueNumber })
      if (res.type === "success") {
        linkedIssues.push(res.issue)
      }
    }

    // --------------------------------------------------
    // 3. Prepare repository workspace (container)
    // --------------------------------------------------
    userPermissions = await checkRepoPermissions(repository.full_name)

    const hostRepoPath = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: prBranch,
    })

    const { containerName } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: prBranch,
      workflowId,
      hostRepoPath,
    })

    const env: RepoEnvironment = { kind: "container", name: containerName }

    let sessionToken: string | undefined = undefined
    if (userPermissions.canPush) {
      const tokenResult = await getAuthToken()
      sessionToken = tokenResult?.token
    }

    // Create directory tree listing (inside container)
    const tree = await createContainerizedDirectoryTree(containerName)

    // --------------------------------------------------
    // 4. Kick-off the agent
    // --------------------------------------------------
    const trace = langfuse.trace({ name: "autoApplyReviewFeedback" })
    const span = trace.span({ name: "PlanAndCodeAgent" })

    const agent = new PlanAndCodeAgent({
      apiKey,
      env,
      defaultBranch: repository.default_branch,
      repository,
      sessionToken,
      jobId: workflowId,
    })

    agent.addSpan({ span, generationName: "autoApplyReviewFeedback" })

    // Build initial prompt
    let prompt = `You are tasked with applying the requested changes from PR review feedback.\n\n` +
      `Repository: ${repoFullName}\n` +
      `Pull-Request: #${pullNumber} (branch: ${prBranch})\n\n`

    if (linkedIssues.length > 0) {
      prompt += `## Linked GitHub issues\n` +
        linkedIssues
          .map(
            (iss) =>
              `### #${iss.number}: ${iss.title}\n${iss.body || "(no description)"}`
          )
          .join("\n\n") +
        "\n\n"
    }

    if (formattedComments) {
      prompt += `## Pull-request comments\n${formattedComments}\n\n`
    }

    if (formattedReviews) {
      prompt += `## Pull-request reviews\n${formattedReviews}\n\n`
    }

    if (tree.length > 0) {
      prompt += `## Codebase directory tree\n${tree.join("\n")}\n\n`
    }

    await agent.addInput({ role: "user", content: prompt, type: "message" })

    await createStatusEvent({
      workflowId,
      content: "Running PlanAndCodeAgent to apply feedback",
    })

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

export default autoApplyReviewFeedback

