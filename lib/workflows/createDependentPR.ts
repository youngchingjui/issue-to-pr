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
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { neo4jDs } from "@/lib/neo4j"

import { generatePRDataMessage } from "./createDependentPR.formatMessage"

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
    // Fetch PR meta, diff, and discussion in parallel (need meta for linked issue and repo details for StorageAdapter)
    const [diff, prMetaAndLinkedIssue] = await Promise.all([
      getPullRequestDiff({ repoFullName, pullNumber }),
      getPullRequestMetaAndLinkedIssue(repoFullName, pullNumber, authProvider),
    ])

    const headRef = prMetaAndLinkedIssue.headRefName
    const baseRef = prMetaAndLinkedIssue.baseRefName

    // Initialize workflow run
    const storage = new StorageAdapter(neo4jDs)
    const repo = await getRepoFromString(repoFullName)
    if (prMetaAndLinkedIssue.linkedIssue) {
      await storage.workflow.run.create({
        id: workflowId,
        type: "createDependentPR",
        issueNumber: prMetaAndLinkedIssue.linkedIssue.number,
        repository: {
          id: Number(repo.id),
          nodeId: repo.node_id,
          fullName: repo.full_name,
          owner:
            (repo.owner as unknown && typeof repo.owner === "object" &&
            "login" in (repo.owner as object)
              ? (repo.owner as { login?: string }).login || ""
              : repo.full_name.split("/")[0]) || "",
          name: repo.name,
          defaultBranch: repo.default_branch || undefined,
          visibility: (repo.visibility
            ? repo.visibility.toUpperCase()
            : undefined) as "PUBLIC" | "PRIVATE" | "INTERNAL" | undefined,
          hasIssues: repo.has_issues ?? undefined,
        },
        postToGithub: true,
        actor: { type: "user", userId: "system" },
      })
    } else {
      // Fallback to legacy initialization if we cannot determine the linked issue yet
      await initializeWorkflowRun({
        id: workflowId,
        type: "createDependentPR",
        repoFullName,
        postToGithub: true,
      })
    }

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting dependent PR workflow for ${repoFullName}#${pullNumber}`,
    })

    // Continue fetching discussion after initialization
    const prDiscussion = await getPullRequestDiscussionGraphQL(
      repoFullName,
      pullNumber,
      authProvider
    )

    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: ${baseRef} <- ${headRef}`,
    })

    const linkedIssue = prMetaAndLinkedIssue.linkedIssue

    // Ensure local repository exists and is up-to-date
    const repoData = await getRepoFromString(repoFullName)
    const hostRepoPath = await setupLocalRepository({
      repoFullName,
      workingBranch: repoData.default_branch,
    })

    // Setup containerized workspace using the local copy
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName,
      branch: repoData.default_branch,
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
      defaultBranch: repoData.default_branch,
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

    // Add PR data to agent as a message
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const workflowUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
      : null

    const dataMessage = generatePRDataMessage({
      repoFullName,
      pullNumber,
      workflowId,
      workflowUrl,
      initiator,
      prMetaAndLinkedIssue,
      prDiscussion,
      linkedIssue,
      tree,
      diff,
    })

    await agent.addInput({
      role: "user",
      type: "message",
      content: dataMessage,
    })

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

