// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { v4 as uuidv4 } from "uuid"

import { CoordinatorAgent } from "@/lib/agents/coordinator"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import WorkflowEventEmitter from "@/lib/services/EventEmitter"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import {
  CallCoderAgentTool,
  GetFileContentTool,
  ReviewPullRequestTool,
  SearchCodeTool,
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
  const workflowId = uuidv4()
  const persistenceService = new WorkflowPersistenceService()

  try {
    // Emit workflow start event
    await persistenceService.saveEvent({
      type: "workflow_start",
      workflowId,
      data: {
        content: `Starting workflow for issue #${issue.number} in ${repository.full_name}`,
      },
      timestamp: new Date(),
    })

    WorkflowEventEmitter.emit(workflowId, {
      type: "llm_response",
      data: {
        content: `Starting workflow for issue #${issue.number} in ${repository.full_name}`,
      },
      timestamp: new Date(),
    })

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
    const searchCodeTool = new SearchCodeTool(repository.full_name)
    const reviewPullRequestTool = new ReviewPullRequestTool({
      repo: repository,
      issue,
      baseDir,
      apiKey,
    })

    // Prepare the coordinator agent
    const coordinatorAgent = new CoordinatorAgent({
      issue,
      apiKey,
      repo: repository,
      tree,
      comments,
    })
    coordinatorAgent.addSpan({ span, generationName: "coordinate" })

    // Add tools for coordinator agent
    coordinatorAgent.addTool(getFileContentTool)
    coordinatorAgent.addTool(callCoderAgentTool)
    coordinatorAgent.addTool(submitPRTool)
    coordinatorAgent.addTool(searchCodeTool)
    coordinatorAgent.addTool(reviewPullRequestTool)
    coordinatorAgent.addJobId(jobId)

    // Run the coordinator agent
    await persistenceService.saveEvent({
      type: "llm_response",
      workflowId,
      data: {
        content: "Starting coordinator agent",
      },
      timestamp: new Date(),
    })

    const result = await coordinatorAgent.runWithFunctions()

    // Emit completion event
    await persistenceService.saveEvent({
      type: "complete",
      workflowId,
      data: {
        content: result,
        success: true,
      },
      timestamp: new Date(),
    })

    WorkflowEventEmitter.emit(workflowId, {
      type: "complete",
      data: {
        content: result,
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

    WorkflowEventEmitter.emit(workflowId, errorEvent)

    throw error
  }
}
