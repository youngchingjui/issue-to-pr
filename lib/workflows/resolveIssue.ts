// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoderAgent } from "@/lib/agents/coder"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { listPlansForIssue } from "@/lib/neo4j/services/plan"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import {
  createBranchTool,
  createCommitTool,
  createCreatePRTool,
  createGetFileContentTool,
  createRipgrepSearchTool,
  createSyncBranchTool,
  createWriteFileContentTool,
} from "@/lib/tools"
import {
  createRepoFullName,
  GitHubIssue,
  GitHubRepository,
  RepoPermissions,
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

  let userPermissions: RepoPermissions | null = null

  try {
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

    // Add base tools to persistent coder
    coder.addTool(getFileContentTool)
    coder.addTool(writeFileTool)
    coder.addTool(searchCodeTool)
    coder.addTool(branchTool)
    coder.addTool(commitTool)

    // Add sync and PR tools only if createPR is true AND permissions are sufficient
    let syncBranchTool: ReturnType<typeof createSyncBranchTool> | undefined
    let createPRTool: ReturnType<typeof createCreatePRTool> | undefined
    if (createPR && userPermissions?.canPush && userPermissions?.canCreatePR) {
      syncBranchTool = createSyncBranchTool(
        createRepoFullName(repository.full_name),
        baseDir
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
            (comment) => `
- **User**: ${comment.user?.login}
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
    const plans = await listPlansForIssue({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })
    plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Take the latest plan for now.
    // TODO: Add a UI to allow the user to select a plan
    const plan = plans[0]

    if (plan) {
      // Inject the plan itself as a user message (for clarity, before issue/comments/tree)
      await coder.addMessage({
        role: "user",
        content: `
Implementation plan for this issue (from previous workflow):
${plan.content}
`,
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
