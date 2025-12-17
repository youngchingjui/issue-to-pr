import {
  getPullRequestDiscussionGraphQL,
  getPullRequestMetaAndLinkedIssue,
} from "@shared/adapters/github/octokit/graphql/pullRequest.reader"
import { GitHubAuthProvider } from "@shared/ports/github/auth"
import { v4 as uuidv4 } from "uuid"

import { DependentPRAgent } from "@/lib/agents/DependentPRAgent"
import { execInContainerWithDockerode } from "@/lib/docker"
import { getRepoFromString } from "@/lib/github/content"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getPullRequestDiff } from "@/lib/github/pullRequests"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import { RepoPermissions } from "@/lib/types/github"
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
  initiator?: {
    type: "ui_button" | "webhook_label" | "api"
    actorLogin?: string
    label?: string
  }
  authProvider: GitHubAuthProvider
}

export async function createDependentPRWorkflow({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
  initiator,
  authProvider,
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

    // Fetch PR meta, diff, and discussion in parallel
    const [diff, prMetaAndLinkedIssue, prDiscussion] = await Promise.all([
      getPullRequestDiff({ repoFullName, pullNumber }),
      getPullRequestMetaAndLinkedIssue(repoFullName, pullNumber, authProvider),
      getPullRequestDiscussionGraphQL(repoFullName, pullNumber, authProvider),
    ])

    const headRef = prMetaAndLinkedIssue.headRefName
    const baseRef = prMetaAndLinkedIssue.baseRefName
    const startingHeadSha = prMetaAndLinkedIssue.headRefOid

    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: ${baseRef} <- ${headRef}`,
    })

    const linkedIssue = prMetaAndLinkedIssue.linkedIssue

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
      owner,
      repo: repoName,
      sessionToken: sessionToken || undefined,
      jobId: workflowId,
      pullNumber,
      originalBody: prMetaAndLinkedIssue.body ?? "",
      authProvider,
    })

    const trace = langfuse.trace({
      name: `Update PR for #${pullNumber}`,
      input: { repoFullName, pullNumber },
    })
    const span = trace.span({ name: "updatePullRequest" })
    agent.addSpan({ span, generationName: "updatePullRequest" })

    // Seed agent with context and instructions
    const formattedComments = prDiscussion.comments
      .map((c) => {
        const author = c.author?.login || "unknown"
        const when = new Date(
          c.createdAt || new Date().toISOString()
        ).toLocaleString()
        return `Comment by ${author} at ${when}\n${c.body}`
      })
      .join("\n\n")

    const formattedReviews = prDiscussion.reviews
      .map((r) => {
        const author = r.author?.login || "unknown"
        const when = new Date(
          r.submittedAt || new Date().toISOString()
        ).toLocaleString()
        return `Review by ${author} (${r.state}) at ${when}\n${r.body || "No comment provided"}`
      })
      .join("\n\n")

    // Include review line comments (flattened from reviews)
    const reviewLineComments = prDiscussion.reviews.flatMap(
      (r) => r.comments || []
    )
    const formattedReviewThreads = reviewLineComments
      .map((c, i) => {
        const author = c.author?.login || "unknown"
        const when = new Date(
          c.createdAt || new Date().toISOString()
        ).toLocaleString()
        const location = c.path || "unknown file"
        const hunk = c.diffHunk ? `\n      Hunk:\n${c.diffHunk}` : ""
        return `Review Comment ${i + 1} by ${author} on ${location} at ${when}\n${c.body}${hunk}`
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
          const [sha, ...rest] = line.split("\t")
          return { sha, subject: rest.join("\t") }
        })
    }

    // Build PR description update context and hand off to the agent to update the body
    const timestamp = new Date().toISOString()
    const originalBody = prMetaAndLinkedIssue.body ?? ""

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
      : null

    const headShaLink = `https://github.com/${repoFullName}/commit/${startingHeadSha}`
    const newHeadShaLink = `https://github.com/${repoFullName}/commit/${newHeadSha}`
    const branchLink = `https://github.com/${repoFullName}/tree/${headRef}`

    // Build comment reference list with links
    const issueCommentLines = prDiscussion.comments.map((c) => {
      const author = c.author?.login || "unknown"
      const when = c.createdAt
        ? new Date(c.createdAt).toLocaleString()
        : "unknown time"
      const url =
        c.url || `https://github.com/${repoFullName}/pull/${pullNumber}`
      return `- General comment by @${author} on ${when}: ${url}`
    })

    const reviewCommentLines = reviewLineComments.map((rc) => {
      const author = rc.author?.login || "unknown"
      const when = rc.createdAt
        ? new Date(rc.createdAt).toLocaleString()
        : "unknown time"
      const url =
        rc.url || `https://github.com/${repoFullName}/pull/${pullNumber}`
      const path = rc.path || "file"
      return `- Review comment by @${author} on ${path} at ${when}: ${url}`
    })

    const commitsList = commitsBetween
      .map(
        (c) =>
          `- ${c.sha.substring(0, 8)} ${c.subject} (${`https://github.com/${repoFullName}/commit/${c.sha}`})`
      )
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

    const prBodyContext = `
# Current PR Body
${originalBody || "(empty)"}

# Update Context (for PR body)
- Timestamp: ${timestamp}
- ${initiatorLine}
- Workflow: ${workflowUrl || "(n/a)"}
- Branch: ${headRef} (${branchLink})
- Starting head: ${startingHeadSha.substring(0, 12)} (${headShaLink})
- New head: ${newHeadSha.substring(0, 12)} (${newHeadShaLink})
${commitsBetween.length > 0 ? `\n## Commits added in this run\n${commitsList}` : "\n## No new commits were added in this run."}
\n## Referenced comments
${issueCommentLines.concat(reviewCommentLines).join("\n") || "- (No comments found)"}

## Guidance
Craft an updated PR description that:
- Focuses on a clear "Update" section summarizing what changed in this run and which feedback was addressed.
- Uses concise bullets with links where helpful, especially to specific comments and commits.
- Avoids manually appending issue references; tooling will handle linkage where applicable.
When ready, call the tool 'update_pull_request' with ONLY the new update section to append to the existing PR body. Do not repeat or rewrite the original PR description above; it will be preserved automatically.
`

    await agent.addInput({
      role: "user",
      type: "message",
      content: prBodyContext,
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
