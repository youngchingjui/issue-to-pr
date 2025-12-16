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
  getPullRequestReviewComments,
  getPullRequestReviewCommentsGraphQL,
  getPullRequestReviews,
  updatePullRequestBody,
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
  initiator?: { type: "ui_button" | "webhook_label" | "api"; actorLogin?: string; label?: string }
}

export async function createDependentPRWorkflow({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
  initiator,
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
    const startingHeadSha = pr.head.sha

    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: ${baseRef} <- ${headRef}`,
    })

    // Fetch linked issue (first closing reference if any) and PR artifacts in parallel
    let linkedIssue: GitHubIssue | undefined
    const [linkedIssues, diff, comments, reviews, reviewThreads, reviewComments] =
      await Promise.all([
        getLinkedIssuesForPR({ repoFullName, pullNumber }),
        getPullRequestDiff({ repoFullName, pullNumber }),
        getPullRequestComments({ repoFullName, pullNumber }),
        getPullRequestReviews({ repoFullName, pullNumber }),
        getPullRequestReviewCommentsGraphQL({ repoFullName, pullNumber }),
        getPullRequestReviewComments({ repoFullName, pullNumber }),
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

    // Create directory tree for context
    const tree = await createContainerizedDirectoryTree(containerName)

    // Initialize the dependent PR agent (reasoning-enabled)
    const agent = new DependentPRAgent({
      apiKey,
      env,
      defaultBranch: repo.default_branch,
      repository: repo,
      sessionToken: sessionToken || undefined,
      jobId: workflowId,
    })

    const trace = langfuse.trace({
      name: `Update PR for #${pullNumber}`,
      input: { repoFullName, pullNumber },
    })
    const span = trace.span({ name: "updatePullRequest" })
    agent.addSpan({ span, generationName: "updatePullRequest" })

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
Implement follow-up commits that address reviewer comments and discussion on PR #${pullNumber}. Work directly on the existing PR branch '${headRef}'. When done, push this branch to origin using the sync tool. Do NOT create a new PR.

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
- When finished, push branch '${headRef}' to GitHub using the sync tool.
- Do not create new branches or PRs; this workflow updates the existing PR.
`

    await agent.addInput({ role: "user", type: "message", content: message })

    await createStatusEvent({ workflowId, content: "Starting PR update agent" })

    await agent.runWithFunctions()

    // Best-effort: ensure branch is pushed (idempotent if already pushed)
    await createStatusEvent({
      workflowId,
      content: `Ensuring branch ${headRef} is pushed`,
    })
    if (sessionToken) {
      await execInContainerWithDockerode({
        name: containerName,
        command: `git push -u origin ${headRef} || true`,
      })
    }

    // Resolve new head SHA and commits added during this run
    const { stdout: newHeadShaOut } = await execInContainerWithDockerode({
      name: containerName,
      command: `git rev-parse HEAD`,
    })
    const newHeadSha = newHeadShaOut.trim()

    let commitsBetween: { sha: string; subject: string }[] = []
    if (startingHeadSha && newHeadSha && startingHeadSha !== newHeadSha) {
      const { stdout: logOut } = await execInContainerWithDockerode({
        name: containerName,
        command: `git log --pretty=format:%H\t%s ${startingHeadSha}..${newHeadSha}`,
      })
      commitsBetween = logOut
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [sha, subject] = line.split("\t")
          return { sha, subject: subject || "" }
        })
    }

    // Update PR description: append a workflow update note with rich details
    const timestamp = new Date().toISOString()
    const originalBody = pr.body ?? ""

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
      : null

    const headShaLink = `https://github.com/${repoFullName}/commit/${startingHeadSha}`
    const newHeadShaLink = `https://github.com/${repoFullName}/commit/${newHeadSha}`
    const branchLink = `https://github.com/${repoFullName}/tree/${headRef}`

    // Build comment reference list with links
    const issueCommentLines = comments.map((c) => {
      const author = c.user?.login || "unknown"
      const when = c.created_at
        ? new Date(c.created_at).toLocaleString()
        : "unknown time"
      const url = c.html_url || `https://github.com/${repoFullName}/pull/${pullNumber}`
      return `- General comment by @${author} on ${when}: ${url}`
    })

    const reviewCommentLines = reviewComments.map((rc) => {
      const author = rc.user?.login || "unknown"
      const when = rc.created_at
        ? new Date(rc.created_at as unknown as string).toLocaleString()
        : "unknown time"
      const url = rc.html_url || `https://github.com/${repoFullName}/pull/${pullNumber}`
      const path = rc.path || "file"
      return `- Review comment by @${author} on ${path} at ${when}: ${url}`
    })

    const commitsList = commitsBetween
      .map((c) => `- ${c.sha.substring(0, 8)} ${c.subject} (${`https://github.com/${repoFullName}/commit/${c.sha}`})`)
      .join("\n")

    const initiatorLine = (() => {
      if (!initiator) return "Initiated by: (unknown)"
      switch (initiator.type) {
        case "ui_button":
          return `Initiated by: @${initiator.actorLogin || "unknown"} via Create Dependent PR button`
        case "webhook_label":
          return `Initiated by: webhook label '${initiator.label || "unknown"}'${initiator.actorLogin ? ` (applied by @${initiator.actorLogin})` : ""}`
        case "api":
        default:
          return `Initiated by: API call${initiator.actorLogin ? ` by @${initiator.actorLogin}` : ""}`
      }
    })()

    const updateNote = `\n\n---\n` +
      `Update via 'updatePR' workflow (run: ${workflowId}) on ${timestamp}.\n` +
      `${initiatorLine}. ${workflowUrl ? `View workflow run details: ${workflowUrl}` : ""}\n` +
      `\n` +
      `Context:\n` +
      `- Branch: ${headRef} (${branchLink})\n` +
      `- Starting head: ${startingHeadSha.substring(0, 12)} (${headShaLink})\n` +
      `- New head: ${newHeadSha.substring(0, 12)} (${newHeadShaLink})\n` +
      (commitsBetween.length > 0
        ? `\nCommits added in this run:\n${commitsList}\n`
        : "\nNo new commits were added in this run.\n") +
      `\nReferenced comments:\n` +
      (issueCommentLines.length + reviewCommentLines.length > 0
        ? [...issueCommentLines, ...reviewCommentLines].join("\n")
        : "- (No comments found)") +
      `\n\nDecision notes:\n- The agent addressed actionable feedback where feasible. Some suggestions may have been deferred; see commit messages and ${workflowUrl || "the workflow log in the app"} for rationale.`

    const newBody = `${originalBody}${updateNote}`

    await createStatusEvent({
      workflowId,
      content: `Updating PR #${pullNumber} description with workflow note`,
    })

    await updatePullRequestBody({
      repoFullName,
      pullNumber,
      body: newBody,
    })

    await createWorkflowStateEvent({ workflowId, state: "completed" })
    return {
      branch: headRef,
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

