import { v4 as uuidv4 } from "uuid"

import { DependentPRAgent } from "@/shared/lib/agents/DependentPRAgent"
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { checkRepoPermissions } from "@/shared/lib/github/users"
import { langfuse } from "@/shared/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/shared/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/shared/lib/neo4j/services/workflow"
import type { RepoEnvironment } from "@/shared/lib/types"
import type { RepoPermissions } from "@/shared/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/shared/lib/utils/container"
import { setupLocalRepository } from "@/shared/lib/utils/utils-server"
import {
  getPullRequestDiscussionGraphQL,
  getPullRequestMetaAndLinkedIssue,
} from "@/shared/adapters/github/octokit/graphql/pullRequest.reader"
import type { GitHubAuthProvider } from "@/shared/ports/github/auth"
import { getInstallationTokenFromRepo } from "@/shared/lib/github/installation"

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

    // Fetch PR meta and discussion using injected auth provider
    const [prMetaAndLinkedIssue, prDiscussion] = await Promise.all([
      getPullRequestMetaAndLinkedIssue(repoFullName, pullNumber, authProvider),
      getPullRequestDiscussionGraphQL(repoFullName, pullNumber, authProvider),
    ])

    const headRef = prMetaAndLinkedIssue.headRefName
    const baseRef = prMetaAndLinkedIssue.baseRefName

    await createStatusEvent({
      workflowId,
      content: `PR #${pullNumber}: ${baseRef} <- ${headRef}`,
    })

    const linkedIssue = prMetaAndLinkedIssue.linkedIssue

    // Ensure local repository exists and is up-to-date (use baseRef as working branch)
    const hostRepoPath = await setupLocalRepository({
      repoFullName,
      workingBranch: baseRef,
    })

    // Setup containerized workspace using the local copy
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName,
      branch: baseRef,
      workflowId,
      hostRepoPath,
    })
    const env: RepoEnvironment = { kind: "container", name: containerName }
    containerCleanup = cleanup

    // Authenticate remote for fetch/push via installation token
    const [owner, repo] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({ owner, repo })

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

    // Fetch diff via installation client
    const { rest } = await authProvider.getInstallationClient()
    const [owner2, repo2] = repoFullName.split("/")
    const diffResp = await rest.pulls.get({
      owner: owner2,
      repo: repo2,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    })
    if (typeof diffResp.data !== "string") {
      throw new Error("Unexpected diff response type")
    }
    const diff = diffResp.data

    // Initialize the dependent PR agent (reasoning-enabled)
    const agent = new DependentPRAgent({
      apiKey,
      env,
      defaultBranch: baseRef,
      owner,
      repo,
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

