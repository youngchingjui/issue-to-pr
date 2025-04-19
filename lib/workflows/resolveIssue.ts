// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoderAgent } from "@/lib/agents/coder"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions, RepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import {
  BranchTool,
  CommitTool,
  CreatePRTool,
  GetFileContentTool,
  RipgrepSearchTool,
  SyncBranchTool,
  WriteFileContentTool,
} from "@/lib/tools"
import {
  createRepoFullName,
  GitHubIssue,
  GitHubRepository,
} from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface ResolveIssueParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
  createPR?: boolean
}

export const resolveIssue = async (params: ResolveIssueParams) => {
  const { issue, repository, apiKey, jobId, createPR } = params
  const workflowId = jobId // Keep workflowId alias for clarity if preferred
  const persistenceService = new WorkflowPersistenceService()

  let userPermissions: RepoPermissions | null = null

  try {
    // Emit workflow start event
    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: `Starting workflow for issue #${issue.number} in ${repository.full_name}`,
      },
      timestamp: new Date(),
    })

    // Check permissions if PR creation is intended
    if (createPR) {
      userPermissions = await checkRepoPermissions(repository.full_name)
      if (!userPermissions.canPush || !userPermissions.canCreatePR) {
        // Log a warning instead of throwing an error
        await persistenceService.saveEvent({
          type: "status", // Or maybe a 'warning' type if we add one later
          workflowId,
          data: {
            status: `Warning: Insufficient permissions to create PR (${userPermissions.reason}). Code will be generated locally only.`,
          },
          timestamp: new Date(),
        })
        // Proceed with the workflow, but PR won't be created
      }
    }

    // Initialize workflow with metadata and issue information
    await persistenceService.initializeWorkflow(
      workflowId,
      {
        workflowType: "resolveIssue",
        postToGithub: createPR,
      },
      {
        number: issue.number,
        repoFullName: repository.full_name,
      }
    )

    // Setup local repository
    const baseDir = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

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
    })

    coder.addJobId(jobId)

    // Load base tools
    const getFileContentTool = new GetFileContentTool(baseDir)
    const searchCodeTool = new RipgrepSearchTool(baseDir)
    const writeFileTool = new WriteFileContentTool(baseDir)
    const branchTool = new BranchTool(baseDir)
    const commitTool = new CommitTool(baseDir, repository.default_branch)

    // Add base tools to persistent coder
    coder.addTool(getFileContentTool)
    coder.addTool(writeFileTool)
    coder.addTool(searchCodeTool)
    coder.addTool(branchTool)
    coder.addTool(commitTool)

    // Add sync and PR tools only if createPR is true AND permissions are sufficient
    let syncBranchTool: SyncBranchTool | undefined
    let createPRTool: CreatePRTool | undefined
    if (createPR && userPermissions?.canPush && userPermissions?.canCreatePR) {
      syncBranchTool = new SyncBranchTool(
        createRepoFullName(repository.full_name),
        baseDir
      )
      createPRTool = new CreatePRTool(repository, issue.number)

      coder.addTool(syncBranchTool)
      coder.addTool(createPRTool)

      await persistenceService.saveEvent({
        type: "status",
        workflowId,
        data: {
          status: "Branch sync and PR creation tools enabled.",
        },
        timestamp: new Date(),
      })
    } else if (createPR) {
      await persistenceService.saveEvent({
        type: "status",
        workflowId,
        data: {
          status:
            "Branch sync and PR creation tools disabled due to insufficient permissions.",
        },
        timestamp: new Date(),
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
            (comment) => `
- **User**: ${comment.user.login}
- **Created At**: ${new Date(comment.created_at).toLocaleString()}
- **Reactions**: ${comment.reactions ? comment.reactions.total_count : 0}
- **Comment**: ${comment.body}
`
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

    // Check for existing plan
    const plan = await persistenceService.getPlanForIssue(
      issue.number,
      repository.full_name
    )

    if (plan) {
      // Inject the plan itself as a user message (for clarity, before issue/comments/tree)
      await coder.addMessage({
        role: "user",
        content: `Implementation plan for this issue (from previous workflow):

${plan.message.data.content || "PLAN CONTENT UNAVAILABLE"}`,
      })
    }

    // Run the persistent coder to implement changes
    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: "Starting code implementation",
      },
      timestamp: new Date(),
    })

    const coderResult = await coder.runWithFunctions()

    // Emit completion event
    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: "completed",
        success: true,
      },
      timestamp: new Date(),
    })

    return coderResult
  } catch (error) {
    // Emit error event
    const errorEvent = {
      type: "error" as const,
      data: {
        error: error instanceof Error ? error : new Error(String(error)),
        recoverable: false,
      },
      timestamp: new Date(),
    }

    await persistenceService.saveEvent({
      ...errorEvent,
      workflowId,
    })

    throw error
  }
}
