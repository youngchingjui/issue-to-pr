import { PlanAndCodeAgent } from "@/lib/agents/PlanAndCodeAgent"
import { getRepoFromString } from "@/lib/github/content"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createContainerizedWorkspace } from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"
import { RepoEnvironment } from "@/lib/types"
import { getIssue } from "@/lib/github/issues"
import { execInContainer } from "@/lib/docker"

interface ResolveMergeConflictsParams {
  repoFullName: string
  pullNumber: number
  apiKey: string
  jobId: string
}

export async function resolveMergeConflicts({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: ResolveMergeConflictsParams) {
  const workflowId = jobId

  let containerCleanup: (() => Promise<void>) | null = null

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "resolveMergeConflicts",
      repoFullName,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Fetching PR #${pullNumber} details for ${repoFullName}`,
    })

    const repo = await getRepoFromString(repoFullName)
    const pr = await getPullRequest({ repoFullName, pullNumber })

    // If PR is mergeable and clean, no conflicts to resolve
    if (pr.mergeable && pr.mergeable_state === "clean") {
      await createStatusEvent({
        workflowId,
        content: `No merge conflicts detected for PR #${pullNumber}. mergeable_state=${pr.mergeable_state}`,
      })
      await createWorkflowStateEvent({ workflowId, state: "completed" })
      return
    }

    // Fetch linked issue (first one if any)
    const linkedIssues = await getLinkedIssuesForPR({
      repoFullName,
      pullNumber,
    })

    let linkedIssueBody = ""
    if (linkedIssues.length > 0) {
      const issueNum = linkedIssues[0]
      const issue = await getIssue({ fullName: repoFullName, issueNumber: issueNum })
      if (issue.type === "success") {
        linkedIssueBody = `Linked Issue #${issueNum}: ${issue.issue.title}\n\n${issue.issue.body || ""}`
      }
    }

    const comments = await getPullRequestComments({ repoFullName, pullNumber })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

    // Prepare local+container workspace on PR branch
    await createStatusEvent({
      workflowId,
      content: `Setting up repository workspace on branch ${pr.head.ref}`,
    })

    const hostRepoPath = await setupLocalRepository({
      repoFullName,
      workingBranch: pr.head.ref,
    })

    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName,
      branch: pr.head.ref,
      workflowId,
      hostRepoPath,
    })
    containerCleanup = cleanup

    const env: RepoEnvironment = { kind: "container", name: containerName }

    // Attempt to merge main into the PR branch inside container to surface conflicts
    await createStatusEvent({
      workflowId,
      content: `Attempting to merge origin/${repo.default_branch} into ${pr.head.ref} to surface conflicts...`,
    })

    await execInContainer({ name: containerName, command: "git fetch origin" })
    const mergeResult = await execInContainer({
      name: containerName,
      command: `git merge origin/${repo.default_branch} || true`,
    })

    await createStatusEvent({
      workflowId,
      content: `Git merge exitCode=${mergeResult.exitCode}. stderr: ${mergeResult.stderr?.slice(0, 500) || ""}`,
    })

    // List files with conflict markers
    const grepResult = await execInContainer({
      name: containerName,
      command: `git ls-files -u | awk '{print $4}' | sort -u`,
    })

    const conflictedFiles = grepResult.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)

    await createStatusEvent({
      workflowId,
      content: conflictedFiles.length
        ? `Conflicted files detected: \n${conflictedFiles.join("\n")}`
        : `No conflicted files detected by git (mergeable_state was ${pr.mergeable_state}). Proceeding with agent-based resolution if needed.`,
    })

    // Prepare agent to resolve conflicts
    const [owner, repoName] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({ owner, repo: repoName })

    const trace = langfuse.trace({ name: "Resolve merge conflicts" })
    const span = trace.span({ name: "resolve_merge_conflicts" })

    const agent = new PlanAndCodeAgent({
      apiKey,
      env,
      defaultBranch: repo.default_branch,
      repository: repo,
      sessionToken: sessionToken || undefined,
      model: "gpt-5",
    })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "resolve_merge_conflicts" })

    // Provide detailed context and instructions
    const contextMessage = `You are tasked with resolving merge conflicts for this pull request so it can be merged cleanly into ${repo.default_branch}.

PR Title: ${pr.title}
PR Body:\n${pr.body || "(no description)"}

${linkedIssueBody ? linkedIssueBody + "\n\n" : ""}Diff (against base):\n${diff}

Comments (${comments.length}):\n${comments.map((c) => `- ${c.user?.login}: ${c.body}`).join("\n")}

Current branch: ${pr.head.ref}
Base branch: ${repo.default_branch}
GitHub indicated mergeable_state='${pr.mergeable_state}'. We attempted a local merge; conflicted files reported by git:\n${conflictedFiles.join(", ") || "(none)"}

Instructions:
- Use the codebase tools to open and edit files containing conflict markers like '<<<<<<<', '=======', '>>>>>>>' and resolve them in line with the PR intent and the linked issue context.
- Make minimal, correct changes that preserve both sides' intentional logic where appropriate.
- After resolving, stage and commit your changes with a message like "Resolve merge conflicts for PR #${pullNumber}".
- Finally, push the branch using the sync_branch_to_remote tool with branch='${pr.head.ref}'.
- Do not open a new pull request; update the existing branch.
`

    await agent.addMessage({ role: "user", content: contextMessage })

    await createStatusEvent({ workflowId, content: "Starting agent to resolve conflicts" })

    await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })
  } catch (error) {
    await createErrorEvent({ workflowId, content: String(error) })
    await createWorkflowStateEvent({ workflowId, state: "error", content: String(error) })
    throw error
  } finally {
    if (containerCleanup) {
      await containerCleanup()
    }
  }
}

