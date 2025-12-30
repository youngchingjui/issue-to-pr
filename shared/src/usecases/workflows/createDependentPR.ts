import { v4 as uuidv4 } from "uuid"

import DependentPRAgent from "@/shared/lib/agents/DependentPRAgent"
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { getRepoFromString } from "@/shared/lib/github/content"
import { getInstallationTokenFromRepo } from "@/shared/lib/github/installation"
import { getIssue } from "@/shared/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviewCommentsGraphQL,
  getPullRequestReviews,
} from "@/shared/lib/github/pullRequests"
import { checkRepoPermissions } from "@/shared/lib/github/users"
import { langfuse } from "@/shared/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/shared/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/shared/lib/neo4j/services/workflow"
import { createBranchTool } from "@/shared/lib/tools/Branch"
import { RepoEnvironment } from "@/shared/lib/types"
import { GitHubIssue, RepoPermissions } from "@/shared/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/shared/lib/utils/container"
import { setupLocalRepository } from "@/shared/lib/utils/utils-server"
import { EventBusPort } from "@/shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@/shared/ports/events/publisher"
import { CheckoutCommitPort } from "@/shared/ports/git/checkoutCommit"
import { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"

interface CreateDependentPRParams {
  repoFullName: string
  pullNumber: number
  login: string
  jobId?: string
}

interface Ports {
  settings: SettingsReaderPort
  eventBus?: EventBusPort
  gitCheckout: CheckoutCommitPort
}

export async function createDependentPRWorkflow(
  { repoFullName, pullNumber, login, jobId }: CreateDependentPRParams,
  { settings, eventBus, gitCheckout }: Ports
) {
  const workflowId = jobId || uuidv4()
  let containerCleanup: (() => Promise<void>) | null = null

  const pub = createWorkflowEventPublisher(eventBus, workflowId)

  try {
    // Get API key from settings
    const apiKeyResult = await settings.getOpenAIKey(login)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      pub.workflow.error("No API key provided and no user settings found")
      throw new Error("No API key provided and no user settings found")
    }
    const apiKey = apiKeyResult.value

    // Initialize workflow run
    await initializeWorkflowRun({
      id: workflowId,
      type: "createDependentPR",
      repoFullName,
      postToGithub: true,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting dependent PR workflow for ${repoFullName}#${pullNumber}`,
    })

    // Fetch PR details and context
    const pr = await getPullRequest({ repoFullName, pullNumber })
    const headRef = pr.head.ref
    const headSha = pr.head.sha
    const baseRef = pr.base.ref

    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: ${baseRef} <- ${headRef}`,
    })

    // Fetch linked issue (first closing reference if any) and PR artifacts in parallel
    let linkedIssue: GitHubIssue | undefined
    const [linkedIssues, diff, comments, reviews, reviewThreads] =
      await Promise.all([
        getLinkedIssuesForPR({ repoFullName, pullNumber }),
        getPullRequestDiff({ repoFullName, pullNumber }),
        getPullRequestComments({ repoFullName, pullNumber }),
        getPullRequestReviews({ repoFullName, pullNumber }),
        getPullRequestReviewCommentsGraphQL({ repoFullName, pullNumber }),
      ])
    if (linkedIssues.length > 0) {
      const res = await getIssue({
        fullName: repoFullName,
        issueNumber: linkedIssues[0],
      })
      if (res.type === "success") linkedIssue = res.issue
    }

    // Ensure local repository exists and is up-to-date
    const repo = await getRepoFromString(repoFullName)
    const hostRepoPath = await setupLocalRepository({
      repoFullName,
      workingBranch: repo.default_branch,
    })

    // Setup containerized workspace using the local copy
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName,
      branch: repo.default_branch,
      workflowId,
      hostRepoPath,
    })
    const env: RepoEnvironment = { kind: "container", name: containerName }
    containerCleanup = cleanup

    // Authenticate remote for fetch/push
    const [owner, repoName] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({
      owner,
      repo: repoName,
    })

    // Check permissions
    const permissions: RepoPermissions | null =
      await checkRepoPermissions(repoFullName)
    if (!permissions?.canPush || !permissions?.canCreatePR) {
      await createStatusEvent({
        workflowId,
        content: `Warning: Insufficient permissions to push or create PRs (${permissions?.reason || "unknown"}). Will still attempt local changes and report back.`,
      })
    }

    // Ensure origin remote embeds credentials
    if (sessionToken) {
      const { exitCode: remoteSetExitCode } =
        await execInContainerWithDockerode({
          name: containerName,
          command: [
            "git",
            "remote",
            "set-url",
            "origin",
            `https://x-access-token:${sessionToken}@github.com/${repoFullName}.git`,
          ],
        })
      if (remoteSetExitCode !== 0) {
        await createStatusEvent({
          workflowId,
          content: `Failed to set origin remote: ${remoteSetExitCode}`,
        })
        throw new Error(`Failed to set origin remote: ${remoteSetExitCode}`)
      }
    }

    // Fetch and checkout the PR head branch
    const dependentBranch = `${headRef}-followup-${workflowId.slice(0, 8)}`
    await createStatusEvent({
      workflowId,
      content: `Checking out PR head commit ${headSha} into branch ${dependentBranch}`,
    })

    const checkoutResult = await gitCheckout.checkoutCommit(containerName, {
      sha: headSha,
      branch: dependentBranch,
    })

    if (!checkoutResult.ok) {
      await createStatusEvent({
        workflowId,
        content: `Failed to checkout PR head: ${checkoutResult.error}`,
      })
      throw new Error(`Failed to checkout PR head: ${checkoutResult.error}`)
    }

    // Create the branch tool
    const branchTool = createBranchTool(env)
    await branchTool.handler({
      branch: dependentBranch,
      createIfNotExists: true,
    })

    // Create directory tree for context
    let tree: string[] = []
    try {
      tree = await createContainerizedDirectoryTree(containerName)
    } catch (e) {
      await createStatusEvent({
        workflowId,
        content: `Warning: Failed to create directory tree: ${String(e)}`,
      })
      tree = ["(directory tree not available)"]
    }

    // Initialize the dependent PR agent (reasoning-enabled)
    const agent = new DependentPRAgent({
      apiKey,
      env,
      defaultBranch: repo.default_branch,
      repository: repo,
      issueNumber: linkedIssue?.number,
      sessionToken: sessionToken || undefined,
      jobId: workflowId,
    })

    const trace = langfuse.trace({
      name: `Create dependent PR for #${pullNumber}`,
      input: { repoFullName, pullNumber },
    })
    const span = trace.span({ name: "createDependentPR" })
    agent.addSpan({ span, generationName: "createDependentPR" })

    // Seed agent with context and instructions
    const formattedComments = comments
      .map(
        (c, i) =>
          `Comment ${i + 1} by ${c.user?.login || "unknown"} at ${
            c.created_at
              ? new Date(c.created_at).toLocaleString()
              : new Date().toLocaleString()
          }\n${c.body}`
      )
      .join("\n\n")

    const formattedReviews = reviews
      .map(
        (r, i) =>
          `Review ${i + 1} by ${r.user?.login || "unknown"} (${r.state}) at ${new Date(
            r.submitted_at || new Date().toISOString()
          ).toLocaleString()}\n${r.body || "No comment provided"}`
      )
      .join("\n\n")

    // Include review line comments (code review threads)
    const formattedReviewThreads = reviewThreads
      .map((rev, i) => {
        const header = `Review Thread ${i + 1} by ${rev.author || "unknown"} (${rev.state}) at ${new Date(
          rev.submittedAt || new Date().toISOString()
        ).toLocaleString()}\n${rev.body || "No review body"}`
        const commentsBlock = (rev.comments || [])
          .map((c) => {
            const hunk = c.diffHunk ? `\n      Hunk:\n${c.diffHunk}` : ""
            return `    - [${c.file || "unknown file"}] ${c.body}${hunk}`
          })
          .join("\n")
        return commentsBlock ? `${header}\n${commentsBlock}` : header
      })
      .join("\n\n")

    const message = `
# Goal
Implement a follow-up patch that addresses reviewer comments and discussion on PR #${pullNumber}. Work directly on branch '${dependentBranch}' which is branched off '${headRef}'. When done, push this branch to origin using the sync tool, then create a new PR targeting the repository's default branch ('${repo.default_branch}') using the create_pull_request tool.

# Repository
${repoFullName}

# Linked Issue
${linkedIssue ? `#${linkedIssue.number} ${linkedIssue.title}\n${linkedIssue.body}` : "(none)"}

# Codebase Directory
${tree.join("\n")}

# Current PR Diff (truncated)
${diff.slice(0, 200000)}
... (truncated)

${formattedComments ? `# Comments\n${formattedComments}\n` : ""}
${formattedReviews ? `# Reviews\n${formattedReviews}\n` : ""}
${formattedReviewThreads ? `# Review Line Comments\n${formattedReviewThreads}\n` : ""}

# Requirements
- Make only the changes necessary to satisfy the feedback in comments and reviews.
- Keep changes small and focused.
- Use meaningful commit messages.
- Run repo checks (type-check/lint) via the provided tools before finishing.
- When finished, push branch '${dependentBranch}' to GitHub using the sync tool.
- Finally, create a PR with base '${repo.default_branch}' using the create_pull_request tool. Choose a clear title and provide a detailed description of the changes you made in response to the reviews. Do not manually append issue references in the body; they will be added automatically if applicable.
`

    await agent.addInput({ role: "user", type: "message", content: message })

    await createStatusEvent({
      workflowId,
      content: "Starting dependent PR agent",
    })

    const result = await agent.runWithFunctions()

    // Ensure branch is pushed
    await createStatusEvent({
      workflowId,
      content: `Ensuring branch ${dependentBranch} is pushed`,
    })
    if (sessionToken) {
      const { exitCode } = await execInContainerWithDockerode({
        name: containerName,
        command: ["git", "push", "-u", "origin", dependentBranch],
      })
      if (exitCode !== 0) {
        throw new Error(`Failed to push branch ${dependentBranch}`)
      }
    } else {
      await createStatusEvent({
        workflowId,
        content: `Warning: No session token available, branch ${dependentBranch} was not pushed to remote.`,
      })
    }

    await createWorkflowStateEvent({ workflowId, state: "completed" })
    return {
      agentResult: result,
      branch: dependentBranch,
    }
  } catch (error) {
    await createErrorEvent({ workflowId, content: String(error) })
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  } finally {
    if (containerCleanup) {
      try {
        await containerCleanup()
      } catch (e) {
        await createStatusEvent({
          workflowId,
          content: `Warning: container cleanup failed: ${String(e)}`,
        })
      }
    }
  }
}
