import { v4 as uuidv4 } from "uuid"

import { DependentPRAgent } from "@/lib/agents/DependentPRAgent"
import { execInContainerWithDockerode } from "@/lib/docker"
import { getRepoFromString } from "@/lib/github/content"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviewCommentsGraphQL,
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
import { createBranchTool } from "@/lib/tools/Branch"
import { RepoEnvironment } from "@/lib/types"
import { GitHubIssue, RepoPermissions } from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface CreateDependentPRParams {
  repoFullName: string
  pullNumber: number
  apiKey: string
  jobId?: string
}

export async function createDependentPRWorkflow({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: CreateDependentPRParams) {
  const workflowId = jobId || uuidv4()
  let containerCleanup: (() => Promise<void>) | null = null

  try {
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
      await execInContainerWithDockerode({
        name: containerName,
        command: `git remote set-url origin "https://x-access-token:${sessionToken}@github.com/${repoFullName}.git"`,
      })
    }

    // Fetch and checkout the PR head branch
    await createStatusEvent({
      workflowId,
      content: `Checking out head branch ${headRef}`,
    })
    await execInContainerWithDockerode({
      name: containerName,
      command: `git fetch origin ${headRef}`,
    })
    // Try checkout tracking remote if local doesn't exist
    const { exitCode: chk1 } = await execInContainerWithDockerode({
      name: containerName,
      command: `git rev-parse --verify ${headRef}`,
    })
    if (chk1 !== 0) {
      await execInContainerWithDockerode({
        name: containerName,
        command: `git checkout -b ${headRef} origin/${headRef}`,
      })
    } else {
      await execInContainerWithDockerode({
        name: containerName,
        command: `git checkout -q ${headRef}`,
      })
      await execInContainerWithDockerode({
        name: containerName,
        command: `git pull --ff-only origin ${headRef}`,
      })
    }

    // Create a dependent branch off the PR head
    const dependentBranch = `${headRef}-followup-${workflowId.slice(0, 8)}`
    await createStatusEvent({
      workflowId,
      content: `Creating dependent branch ${dependentBranch}`,
    })
    const branchTool = createBranchTool(env)
    await branchTool.handler({
      branch: dependentBranch,
      createIfNotExists: true,
    })

    // Create directory tree for context
    const tree = await createContainerizedDirectoryTree(containerName)

    // Initialize the dependent PR agent (reasoning-enabled)
    const agent = new DependentPRAgent({
      apiKey,
      env,
      defaultBranch: repo.default_branch,
      repoFullName,
      baseRefName: headRef,
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
          `Comment ${i + 1} by ${c.user?.login || "unknown"} at ${new Date(c.created_at || new Date().toISOString()).toLocaleString()}\n${c.body}`
      )
      .join("\n\n")

    const formattedReviews = reviews
      .map(
        (r, i) =>
          `Review ${i + 1} by ${r.user?.login || "unknown"} (${r.state}) at ${new Date(r.submitted_at || new Date().toISOString()).toLocaleString()}\n${r.body || "No comment provided"}`
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
Implement a follow-up patch that addresses reviewer comments and discussion on PR #${pullNumber}. Work directly on branch '${dependentBranch}' which is branched off '${headRef}'. When done, push this branch to origin using the sync tool, then create a dependent PR targeting base '${headRef}' using the create_dependent_pull_request tool.

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
- Finally, create a dependent PR with base '${headRef}' using the create_dependent_pull_request tool. Choose a clear title and provide a detailed description of the changes you made in response to the reviews.
`

    await agent.addInput({ role: "user", type: "message", content: message })

    await createStatusEvent({ workflowId, content: "Starting dependent PR agent" })

    const result = await agent.runWithFunctions()

    // Best-effort: ensure branch is pushed (idempotent if already pushed)
    await createStatusEvent({
      workflowId,
      content: `Ensuring branch ${dependentBranch} is pushed`,
    })
    if (sessionToken) {
      await execInContainerWithDockerode({
        name: containerName,
        command: `git push -u origin ${dependentBranch} || true`,
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
    if (containerCleanup) await containerCleanup()
  }
}

