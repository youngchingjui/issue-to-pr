// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoordinatorAgent } from "@/lib/agents/coordinator"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import {
  CallCoderAgentTool,
  GetFileContentTool,
  RipgrepSearchTool,
  UploadAndPRTool,
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

    // Load all the tools
    const callCoderAgentTool = new CallCoderAgentTool({ apiKey, baseDir })
    const getFileContentTool = new GetFileContentTool(baseDir)
    const submitPRTool = new UploadAndPRTool(repository, baseDir, issue.number)
    const searchCodeTool = new RipgrepSearchTool(baseDir)

    // Prepare the coordinator agent
    const coordinatorAgent = new CoordinatorAgent({
      apiKey,
    })
    coordinatorAgent.addSpan({ span, generationName: "coordinate" })
    coordinatorAgent.addJobId(jobId)

    // Add issue information as user message
    await coordinatorAgent.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    // Add comments if they exist
    if (comments && comments.length > 0) {
      await coordinatorAgent.addMessage({
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
      await coordinatorAgent.addMessage({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
      })
    }

    // Add tools for coordinator agent
    coordinatorAgent.addTool(getFileContentTool)
    coordinatorAgent.addTool(callCoderAgentTool)
    coordinatorAgent.addTool(submitPRTool)
    coordinatorAgent.addTool(searchCodeTool)

    // Run the coordinator agent
    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: "Starting coordinator agent",
      },
      timestamp: new Date(),
    })

    const result = await coordinatorAgent.runWithFunctions()

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

    return result
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
