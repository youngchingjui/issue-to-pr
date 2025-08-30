import { v4 as uuidv4 } from "uuid"

import { MergeConflictResolverAgent } from "@/lib/agents/MergeConflictResolverAgent"
import { getRepoFromString } from "@/lib/github/content"
import { getPullRequestConflictContext } from "@/lib/github/graphql/queries/getPullRequestConflictContext"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getIssue } from "@/lib/github/issues"
import {
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
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import { GitHubIssue } from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface ResolveMergeConflictsParams {
  repoFullName: string
  pullNumber: number
  apiKey: string
  jobId?: string
}

export async function resolveMergeConflicts({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: ResolveMergeConflictsParams) {
  const workflowId = jobId || uuidv4()

  let containerCleanup: (() => Promise<void>) | null = null

  try {
    // Initialize workflow run
    await initializeWorkflowRun({
      id: workflowId,
      type: "resolveMergeConflicts",
      repoFullName,
      postToGithub: false,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting merge-conflict resolution workflow for ${repoFullName}#${pullNumber}`,
    })

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

    // Fetch PR core context via GraphQL (mergeable field etc.)
    await createStatusEvent({
      workflowId,
      content: `Fetching pull request details (GraphQL)`,
    })
    const pr = await getPullRequestConflictContext({
      repoFullName,
      pullNumber,
    })

    // Fetch linked issue (first closing reference if any)
    let linkedIssue: GitHubIssue | undefined
    if (pr.linkedIssueNumbers.length > 0) {
      const res = await getIssue({
        fullName: repoFullName,
        issueNumber: pr.linkedIssueNumbers[0],
      })
      if (res.type === "success") linkedIssue = res.issue
    }

    // Fetch diff, comments, and reviews
    await createStatusEvent({ workflowId, content: `Fetching PR diff` })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

    await createStatusEvent({ workflowId, content: `Fetching PR comments` })
    const comments = await getPullRequestComments({
      repoFullName,
      pullNumber,
    })

    await createStatusEvent({ workflowId, content: `Fetching PR reviews` })
    const reviews = await getPullRequestReviews({ repoFullName, pullNumber })

    // Generate a directory tree of the codebase
    const tree = await createContainerizedDirectoryTree(containerName)

    // Prepare initial LLM message consolidating all context
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

    const message = `
# Pull Request Context
- Repository: ${repoFullName}
- PR: #${pr.number} ${pr.title}
- State: ${pr.state}${pr.isDraft ? " (draft)" : ""}
- Base -> Head: ${pr.baseRefName} <- ${pr.headRefName}
- Author: ${pr.author?.login || "unknown"}
- Mergeable: ${pr.mergeable}${pr.reviewDecision ? `, reviewDecision: ${pr.reviewDecision}` : ""}
- URL: ${pr.url}
- Updated: ${new Date(pr.updatedAt).toLocaleString()}

## Merge State Notes
- mergeStateStatus (GitHub): ${pr.mergeStateStatus || "n/a"}
- Files (first 100):\n${(pr.files?.nodes || [])
      .map((f) => `  - ${f.path} (+${f.additions}, -${f.deletions}) ${f.changeType ? ` [${f.changeType}]` : ""}`)
      .join("\n")}

${linkedIssue ? `## Linked Issue\n- #${linkedIssue.number} ${linkedIssue.title}\n${linkedIssue.body}\n` : ""}

## Codebase Directory
${tree.join("\n")}

## Diff
${diff}

${formattedComments ? `## Comments\n${formattedComments}\n` : ""}
${formattedReviews ? `## Reviews\n${formattedReviews}\n` : ""}
`

    // Get token for pushing back to PR branch
    const [owner, repoName] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({
      owner,
      repo: repoName,
    })

    // Initialize agent
    const agent = new MergeConflictResolverAgent({
      apiKey,
      repository: repo,
      env,
      defaultBranch: repo.default_branch,
      issueNumber: linkedIssue?.number,
      sessionToken,
      jobId: workflowId,
    })

    // Start a trace
    const trace = langfuse.trace({
      name: `Resolve merge conflicts for PR #${pullNumber}`,
      input: { repoFullName, pullNumber },
    })
    const span = trace.span({ name: "resolveMergeConflicts" })
    agent.addSpan({ span, generationName: "resolveMergeConflicts" })

    // Seed the agent with context
    await agent.addMessage({ role: "user", content: message })

    await createStatusEvent({
      workflowId,
      content: "Starting MergeConflictResolverAgent",
    })

    const response = await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })
    return response
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

