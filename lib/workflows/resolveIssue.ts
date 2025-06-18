// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { exec } from "child_process"
import { promisify } from "util"

import { CoderAgent } from "@/lib/agents/coder"
import { createDirectoryTree } from "@/lib/fs"
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
import {
  createBranchTool,
  createCommitTool,
  createCreatePRTool,
  createFileCheckTool,
  createGetFileContentTool,
  createRipgrepSearchTool,
  createSyncBranchTool,
  createWriteFileContentTool,
} from "@/lib/tools"
import { Environment, Plan, RepoSettings } from "@/lib/types"
import {
  GitHubIssue,
  GitHubRepository,
  repoFullNameSchema,
  RepoPermissions,
} from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

const execPromise = promisify(exec)

interface ResolveIssueParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
  createPR?: boolean
  planId?: string
  environment?: Environment
  installCommand?: string
}

// === Python environment configuration constants ===
const PYTHON_VENV_NAME = ".venv"
const PYTHON_DEFAULT_INSTALL_CMD = (baseDir: string) =>
  `${baseDir}/${PYTHON_VENV_NAME}/bin/pip install -r requirements.txt`
// === End Python environment configuration constants ===

export const resolveIssue = async ({
  issue,
  repository,
  apiKey,
  jobId,
  createPR,
  planId,
  environment,
  installCommand,
}: ResolveIssueParams) => {
  const workflowId = jobId // Keep workflowId alias for clarity if preferred

  let userPermissions: RepoPermissions | null = null

  const repoFullName = repoFullNameSchema.parse(repository.full_name)
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

    // Setup local repository
    const baseDir = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    // ===== Python/Other environment install step =====
    // choose environment/commands from params or repo settings
    let resolvedEnvironment = environment
    let resolvedSetupCommands: string = ""
    if (!resolvedEnvironment && repoSettings?.environment)
      resolvedEnvironment = repoSettings.environment
    if (repoSettings?.setupCommands && repoSettings.setupCommands.length) {
      resolvedSetupCommands = repoSettings.setupCommands
    }

    // Handle python and setup commands if present
    if (resolvedEnvironment === "python") {
      const fs = await import("fs/promises")
      const path = await import("path")
      let venvExists = false
      const venvDir = path.join(baseDir, PYTHON_VENV_NAME)
      try {
        await fs.access(venvDir)
        venvExists = true
      } catch {}
      if (!venvExists) {
        await createStatusEvent({
          workflowId,
          content: `No virtual environment found. Creating one at ${venvDir}`,
        })
        try {
          await execPromise(`python3 -m venv ${PYTHON_VENV_NAME}`, {
            cwd: baseDir,
          })
        } catch (err) {
          await createErrorEvent({
            workflowId,
            content: `Failed to create virtual environment: ${err}`,
          })
          await createWorkflowStateEvent({
            workflowId,
            state: "error",
            content: `Virtual environment creation failed: ${err}`,
          })
          throw new Error("Virtual environment creation failed")
        }
      }
      // install command: arg overrides, then repo settings, then default
      let command = installCommand
      if (!command && resolvedSetupCommands) command = resolvedSetupCommands
      if (!command) command = PYTHON_DEFAULT_INSTALL_CMD(baseDir)
      await createStatusEvent({
        workflowId,
        content: `Detected Python environment. Running install command: ${command}`,
      })
      try {
        await execPromise(command, { cwd: baseDir })
      } catch (err) {
        await createErrorEvent({
          workflowId,
          content: `Install command failed: ${err}`,
        })
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: `Dependency install failed: ${err}`,
        })
        throw new Error("Dependency installation failed")
      }
    } else if (resolvedSetupCommands.length) {
      // generic setup commands (other than python)
      for (const cmd of resolvedSetupCommands) {
        await createStatusEvent({
          workflowId,
          content: `Running setup command: ${cmd}`,
        })
        try {
          await execPromise(cmd, { cwd: baseDir })
        } catch (err) {
          await createErrorEvent({
            workflowId,
            content: `Setup command failed: ${err}`,
          })
          await createWorkflowStateEvent({
            workflowId,
            state: "error",
            content: `Setup command failed: ${err}`,
          })
          throw new Error(`Setup command failed: ${err}`)
        }
      }
    }
    // ===== End environment/setup step =====

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
    const tree = await createDirectoryTree(baseDir)

    // Retrieve all the comments on the issue
    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    // Initialize the persistent coder agent
    const coder = new CoderAgent({
      apiKey,
      createPR: Boolean(
        createPR && userPermissions?.canPush && userPermissions?.canCreatePR
      ),
    })
    await coder.addJobId(jobId)
    coder.addSpan({ span, generationName: "resolveIssue" })

    // Load base tools
    const getFileContentTool = createGetFileContentTool(baseDir)
    const searchCodeTool = createRipgrepSearchTool(baseDir)
    const writeFileTool = createWriteFileContentTool(baseDir)
    const branchTool = createBranchTool(baseDir)
    const commitTool = createCommitTool(baseDir, repository.default_branch)
    const fileCheckTool = createFileCheckTool(baseDir)

    // Add base tools to persistent coder
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
        baseDir,
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
  }
}
