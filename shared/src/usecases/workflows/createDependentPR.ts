import { v4 as uuidv4 } from "uuid"

import {
  getPullRequestDiscussionGraphQL,
  getPullRequestMetaAndLinkedIssue,
} from "@/shared/adapters/github/octokit/graphql/pullRequest.reader"
import { clearAccessToken, setAccessToken } from "@/shared/auth"
import { DependentPRAgent } from "@/shared/lib/agents/DependentPRAgent"
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { getInstallationTokenFromRepo } from "@/shared/lib/github/installation"
import { checkRepoPermissions } from "@/shared/lib/github/users"
import { langfuse } from "@/shared/lib/langfuse"
import type { RepoEnvironment } from "@/shared/lib/types"
import type { RepoPermissions } from "@/shared/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/shared/lib/utils/container"
import { setupLocalRepository } from "@/shared/lib/utils/utils-server"
import type { DatabaseStorage, WorkflowRunHandle } from "@/shared/ports/db"
import type { GitHubAuthProvider } from "@/shared/ports/github/auth"

import { generatePRDataMessage } from "./createDependentPR.formatMessage"

interface CreateDependentPRParams {
  repoFullName: string
  pullNumber: number
  storage: DatabaseStorage
  userId: string
  jobId?: string
  initiator?: {
    type: "ui_button" | "webhook_label" | "api"
    actorLogin?: string
    label?: string
  }
  authProvider: GitHubAuthProvider
  webAppUrl?: string | null
  environmentName?: string | null
}

export async function createDependentPRWorkflow({
  repoFullName,
  pullNumber,
  storage,
  userId,
  jobId,
  initiator,
  authProvider,
  webAppUrl,
  environmentName,
}: CreateDependentPRParams) {
  const workflowId = jobId || uuidv4()
  let containerCleanup: (() => Promise<void>) | null = null
  let runHandle: WorkflowRunHandle | null = null

  try {
    // Initialize workflow run using storage port
    runHandle = await storage.workflow.run.create({
      id: workflowId,
      type: "createDependentPR",
      target: {
        repository: {
          // Will be populated after fetching PR metadata
        },
      },
      config: { postToGithub: true },
    })

    // Fetch API key from settings via storage port
    const apiKeyResult = await storage.settings.user.getOpenAIKey(userId)

    // Handle errors (user not found, database issues)
    if (!apiKeyResult.ok) {
      const error =
        apiKeyResult.error === "UserNotFound"
          ? `User '${userId}' not found in database; cannot run createDependentPR workflow`
          : `Database error fetching API key for user '${userId}'; cannot run createDependentPR workflow`
      await runHandle.add.event({
        type: "workflow.error",
        payload: { message: error },
      })
      throw new Error(error)
    }

    // Handle missing API key (user exists but hasn't configured it)
    if (!apiKeyResult.value) {
      const error = `User '${userId}' has not configured an OpenAI API key; cannot run createDependentPR workflow. Please add your API key in settings.`
      await runHandle.add.event({
        type: "workflow.error",
        payload: { message: error },
      })
      throw new Error(error)
    }

    const apiKey = apiKeyResult.value

    await runHandle.add.event({
      type: "workflow.started",
      payload: { state: "running" },
    })

    await runHandle.add.event({
      type: "status",
      payload: {
        content: `Starting dependent PR workflow for ${repoFullName}#${pullNumber}`,
      },
    })

    // Fetch PR meta and discussion using injected auth provider
    const [prMetaAndLinkedIssue, prDiscussion] = await Promise.all([
      getPullRequestMetaAndLinkedIssue(repoFullName, pullNumber, authProvider),
      getPullRequestDiscussionGraphQL(repoFullName, pullNumber, authProvider),
    ])

    const headRef = prMetaAndLinkedIssue.headRefName
    const baseRef = prMetaAndLinkedIssue.baseRefName

    await runHandle.add.event({
      type: "status",
      payload: { content: `PR #${pullNumber}: ${baseRef} <- ${headRef}` },
    })

    const linkedIssue = prMetaAndLinkedIssue.linkedIssue

    // Get installation token first (needed for setupLocalRepository)
    const [owner, repo] = repoFullName.split("/")
    const sessionToken = await getInstallationTokenFromRepo({ owner, repo })

    // TEMPORARY FIX: Set token in deprecated global store for setupLocalRepository
    // TODO: Remove this after refactoring setupLocalRepository to accept token as parameter (see #1474)
    if (sessionToken) {
      setAccessToken(sessionToken)
    }

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

    // Check permissions
    const permissions: RepoPermissions | null =
      await checkRepoPermissions(repoFullName)
    if (!permissions?.canPush || !permissions?.canCreatePR) {
      await runHandle.add.event({
        type: "status",
        payload: {
          content: `Warning: Insufficient permissions to push or create PRs (${permissions?.reason || "unknown"}). Will still attempt local changes and report back.`,
        },
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
    await runHandle.add.event({
      type: "status",
      payload: { content: `Checking out head branch ${headRef}` },
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
    // Generate workflow reference based on environment
    const workflowUrl = webAppUrl
      ? `${webAppUrl.replace(/\/$/, "")}/workflow-runs/${workflowId}`
      : null

    const workflowReference = workflowUrl
      ? `View workflow: ${workflowUrl}`
      : `Workflow ID: ${workflowId}${environmentName ? ` (ran on ${environmentName})` : ""}`

    const dataMessage = generatePRDataMessage({
      repoFullName,
      pullNumber,
      workflowId,
      workflowUrl,
      workflowReference,
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

    await runHandle.add.event({
      type: "status",
      payload: { content: "Starting PR update agent" },
    })

    await agent.runWithFunctions()

    // Best-effort: ensure branch is pushed (idempotent if already pushed)
    await runHandle.add.event({
      type: "status",
      payload: { content: `Ensuring branch ${headRef} is pushed` },
    })
    if (sessionToken) {
      await execInContainerWithDockerode({
        name: containerName,
        command: `git push -u origin ${headRef} || true`,
      })
    }

    await runHandle.add.event({
      type: "workflow.completed",
      payload: { state: "completed" },
    })
    return {
      branch: headRef,
    }
  } catch (error) {
    if (runHandle) {
      await runHandle.add.event({
        type: "workflow.error",
        payload: { message: String(error) },
      })
    }
    throw error
  } finally {
    // Cleanup container
    if (containerCleanup) await containerCleanup()
    // TEMPORARY FIX: Clear the access token from global store
    // TODO: Remove this after refactoring setupLocalRepository (see #1474)
    clearAccessToken()
  }
}
