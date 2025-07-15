// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoderAgent } from "@/lib/agents/coder"
import { getAuthToken } from "@/lib/github"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import {
  getPlanWithDetails,
  listPlansForIssue,
} from "@/lib/neo4j/services/plan"
import { getRepositorySettings } from "@/lib/neo4j/services/repository"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createBranchTool } from "@/lib/tools/Branch"
import { createCommitTool } from "@/lib/tools/Commit"
import { createCreatePRTool } from "@/lib/tools/CreatePRTool"
import { createFileCheckTool } from "@/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { createSetupRepoTool } from "@/lib/tools/SetupRepoTool"
import { createSyncBranchTool } from "@/lib/tools/SyncBranchTool"
import { createWriteFileContentTool } from "@/lib/tools/WriteFileContent"
import { Plan, RepoEnvironment, RepoSettings } from "@/lib/types"
import {
  GitHubIssue,
  GitHubRepository,
  repoFullNameSchema,
  RepoPermissions,
} from "@/lib/types/github"
import { setupEnv } from "@/lib/utils/cli"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface ResolveIssueParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
  createPR?: boolean
  planId?: string
  // Optional custom repository setup commands
  installCommand?: string // Legacy alias; treat as setupCommands when provided
}

export const resolveIssue = async ({
  issue,
  repository,
  apiKey,
  jobId,
  createPR,
  planId,
  installCommand,
}: ResolveIssueParams) => {
  const workflowId = jobId // Keep workflowId alias for clarity if preferred

  let userPermissions: RepoPermissions | null = null

  const repoFullName = repoFullNameSchema.parse(repository.full_name)
  let containerCleanup: (() => Promise<void>) | null = null
  try {
    const repoSettings: RepoSettings | null =
      await getRepositorySettings(repoFullName)

    // Emit workflow start event
    await initializeWorkflowRun({
      id: workflowId,
      type: "resolveIssue",
      issueNumber: issue.number,
      repoFullName: repository.full_name,
      postToGithub: createPR,
    })

    // Emit workflow "running" state event
    await createWorkflowStateEvent({
      workflowId,
      state: "running",
    })

    await createStatusEvent({
      workflowId,
      content: `Starting workflow for issue #${issue.number} in ${repository.full_name}`,
    })

    // Check permissions if PR creation is intended
    if (createPR) {
      userPermissions = await checkRepoPermissions(repository.full_name)
      if (!userPermissions.canPush || !userPermissions.canCreatePR) {
        // Log a warning instead of throwing an error
        await createStatusEvent({
          workflowId,
          content: `Warning: Insufficient permissions to create PR (${userPermissions.reason}). Code will be generated locally only.`,
        })
        // Proceed with the workflow, but PR won't be created
      }
    }

    // Ensure local repository exists and is up-to-date
    const hostRepoPath = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    // Setup containerized repository using the local copy
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: repository.default_branch,
      workflowId,
      hostRepoPath,
    })
    const env: RepoEnvironment = { kind: "container", name: containerName }
    containerCleanup = cleanup
    await createStatusEvent({
      workflowId,
      content: `Setting up containerized environment`,
    })

    // Setup environment
    let resolvedSetupCommands: string | string[] = ""
    if (repoSettings?.setupCommands && repoSettings.setupCommands.length) {
      resolvedSetupCommands = repoSettings.setupCommands
    }
    if (installCommand && !resolvedSetupCommands) {
      resolvedSetupCommands = installCommand
    }

    if (resolvedSetupCommands) {
      try {
        const setupMsg = await setupEnv(env, resolvedSetupCommands)
        await createStatusEvent({
          workflowId,
          content: setupMsg,
        })
      } catch (err) {
        await createErrorEvent({
          workflowId,
          content: `Setup failed: ${String(err)}`,
        })
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: `Setup failed: ${String(err)}`,
        })
        throw err
      }
    } else {
      await createStatusEvent({
        workflowId,
        content: "No setup commands provided. Skipping environment setup.",
      })
    }

    // Get token from session for authenticated git push
    let sessionToken: string | undefined = undefined
    if (createPR && userPermissions?.canPush && userPermissions?.canCreatePR) {
      const tokenResult = await getAuthToken()
      if (tokenResult?.token) {
        sessionToken = tokenResult.token
      } else {
        throw new Error(
          "Could not obtain authentication token for pushing branch"
        )
      }
    }

    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Resolve issue",
    })
    const span = trace.span({ name: "coordinate" })

    // Generate a directory tree of the codebase
    const tree = await createContainerizedDirectoryTree(containerName)

    // Retrieve all the comments on the issue
    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    // Initialize the persistent coder agent
    const coder = new CoderAgent({
      apiKey,
      model: "o3",
      createPR: Boolean(
        createPR && userPermissions?.canPush && userPermissions?.canCreatePR
      ),
    })
    await coder.addJobId(jobId)
    coder.addSpan({ span, generationName: "resolveIssue" })

    // Load base tools
    const setupRepoTool = createSetupRepoTool(env)
    const getFileContentTool = createGetFileContentTool(env)
    const searchCodeTool = createRipgrepSearchTool(env)
    const writeFileTool = createWriteFileContentTool(env)
    const branchTool = createBranchTool(env)
    const commitTool = createCommitTool(env, repository.default_branch)
    const fileCheckTool = createFileCheckTool(env)

    // Add base tools to persistent coder
    coder.addTool(setupRepoTool)
    coder.addTool(getFileContentTool)
    coder.addTool(writeFileTool)
    coder.addTool(searchCodeTool)
    coder.addTool(branchTool)
    coder.addTool(commitTool)
    coder.addTool(fileCheckTool)

    // Add sync and PR tools only if createPR is true AND permissions are sufficient
    let syncBranchTool: ReturnType<typeof createSyncBranchTool> | undefined
    let createPRTool: ReturnType<typeof createCreatePRTool> | undefined
    if (
      createPR &&
      userPermissions?.canPush &&
      userPermissions?.canCreatePR &&
      sessionToken
    ) {
      syncBranchTool = createSyncBranchTool(
        repoFullNameSchema.parse(repository.full_name),
        env,
        sessionToken
      )
      createPRTool = createCreatePRTool(repository, issue.number)

      coder.addTool(syncBranchTool)
      coder.addTool(createPRTool)

      await createStatusEvent({
        workflowId,
        content:
          "You have permissions to push commits and create pull requests on this repository.",
      })
    } else if (createPR) {
      await createStatusEvent({
        workflowId,
        content:
          "You don't have sufficient permissions to push commits or create pull requests on this repository. Changes will only be made locally.",
      })
    }

    // Track the span for the coder agent on LangFuse
    coder.addSpan({ span, generationName: "Edit Code" })

    // Add issue information as user message
    await coder.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    // Add comments if they exist
    if (comments && comments.length > 0) {
      await coder.addMessage({
        role: "user",
        content: `Github issue comments:\n${comments
          .map(
            (comment) =>
              `\n- **User**: ${comment.user?.login}\n- **Created At**: ${new Date(comment.created_at).toLocaleString()}\n- **Reactions**: ${comment.reactions ? comment.reactions.total_count : 0}\n- **Comment**: ${comment.body}\n`
          )
          .join("\n")}`,
      })
    }

    // Add tree information as user message
    if (tree && tree.length > 0) {
      await coder.addMessage({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
      })
    }

    let plan: Plan | undefined
    if (planId) {
      // Use the specified plan by id
      try {
        const planDetails = await getPlanWithDetails(planId)
        plan = planDetails.plan
      } catch (err) {
        await createStatusEvent({
          workflowId,
          content: `Specified planId (${planId}) not found or could not be loaded: ${err}`,
        })
      }
    }
    if (!plan) {
      // Fallback to latest plan logic
      const plans = await listPlansForIssue({
        repoFullName: repository.full_name,
        issueNumber: issue.number,
      })
      plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      plan = plans[0]
    }
    if (plan) {
      // Inject the plan itself as a user message (for clarity, before issue/comments/tree)
      await coder.addMessage({
        role: "user",
        content: `\nImplementation plan for this issue (from previous workflow):\n${plan.content}\n`,
      })
    }

    // Run the persistent coder to implement changes

    await createStatusEvent({
      workflowId,
      content: "Starting code implementation",
    })

    const coderResult = await coder.runWithFunctions()

    // Emit completion event

    await createWorkflowStateEvent({
      workflowId,
      state: "completed",
    })

    return coderResult
  } catch (error) {
    // Emit error event

    await createErrorEvent({
      workflowId,
      content: String(error),
    })

    // Emit workflow state event for error status
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })

    /*
      Consistency note: On error, both an error event and a workflow state error event
      are emitted. This ensures all consumers (frontend/infra) get proper error status updates.
    */
    throw error
  } finally {
    if (containerCleanup) {
      await containerCleanup()
    }
  }
}
