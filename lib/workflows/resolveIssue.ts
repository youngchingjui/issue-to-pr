// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoderAgent } from "@/lib/agents/coder"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import {
  BranchTool,
  CommitTool,
  GetFileContentTool,
  RipgrepSearchTool,
  WriteFileContentTool,
} from "@/lib/tools"
import { GitHubIssue, GitHubRepository } from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

export const resolveIssue = async (
  issue: GitHubIssue,
  repository: GitHubRepository,
  apiKey: string,
  jobId: string
) => {
  const workflowId = jobId
  const persistenceService = new WorkflowPersistenceService()

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

    // Initialize workflow with metadata and issue information
    await persistenceService.initializeWorkflow(
      workflowId,
      {
        workflowType: "resolveIssue",
        postToGithub: true,
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

    // Load all the tools
    const getFileContentTool = new GetFileContentTool(baseDir)
    const searchCodeTool = new RipgrepSearchTool(baseDir)
    const writeFileTool = new WriteFileContentTool(baseDir)
    const branchTool = new BranchTool(baseDir)
    const commitTool = new CommitTool(baseDir, repository.default_branch)

    // Add tools to persistent coder
    coder.addTool(getFileContentTool)
    coder.addTool(writeFileTool)
    coder.addTool(searchCodeTool)
    coder.addTool(branchTool)
    coder.addTool(commitTool)

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
