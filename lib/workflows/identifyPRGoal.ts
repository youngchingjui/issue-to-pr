import { v4 as uuidv4 } from "uuid"

import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import WorkflowEventEmitter from "@/lib/services/EventEmitter"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { GetIssueTool } from "@/lib/tools"
import { GitHubIssue } from "@/lib/types/github"
import { updateJobStatus } from "@/lib/utils/utils-common"

interface IdentifyPRGoalParams {
  repoFullName: string
  pullNumber: number
  apiKey: string
  linkedIssue?: GitHubIssue
  jobId: string
}

export async function identifyPRGoal({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: IdentifyPRGoalParams): Promise<string> {
  const workflowId = uuidv4()
  const persistenceService = new WorkflowPersistenceService()

  try {
    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Identify PR Goal",
    })
    const span = trace.span({ name: "identify_goal" })

    // Emit workflow start event
    await persistenceService.saveEvent({
      type: "workflow_start",
      workflowId,
      data: {
        repoFullName,
        pullNumber,
      },
      timestamp: new Date(),
    })

    WorkflowEventEmitter.emit(workflowId, {
      type: "llm_response",
      data: {
        content: `Starting PR goal identification for PR #${pullNumber} in ${repoFullName}`,
      },
      timestamp: new Date(),
    })

    // Add status updates throughout the workflow
    updateJobStatus(jobId, "Fetching repository information...")
    await persistenceService.saveEvent({
      type: "tool_call",
      workflowId,
      data: {
        tool: "getRepoFromString",
        params: {
          repoFullName,
        },
      },
      timestamp: new Date(),
    })

    const repo = await getRepoFromString(repoFullName)

    updateJobStatus(jobId, "Retrieving PR details and comments...")
    await persistenceService.saveEvent({
      type: "tool_call",
      workflowId,
      data: {
        tool: "getPullRequest",
        params: {
          repoFullName,
          pullNumber,
        },
      },
      timestamp: new Date(),
    })

    const pr = await getPullRequest({ repoFullName, pullNumber })
    const comments = await getPullRequestComments({ repoFullName, pullNumber })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

    updateJobStatus(jobId, "Analyzing PR with AI...")
    const agent = new GoalIdentifierAgent({
      apiKey,
    })

    // Add the get_issue tool
    const getIssueTool = new GetIssueTool({
      repo,
    })

    agent.addTool(getIssueTool)
    agent.addSpan({ span, generationName: "identify_goal" })

    // Add initial message with PR details
    const initialMessage = {
      role: "user" as const,
      content: `Here are the details of the pull request to analyze:

Title: ${pr.title}
Description:
${pr.body || "(No description provided)"}

Diff: 
${diff}

Number of comments: ${comments.length}
Comments:
${comments.map((comment) => `- ${comment.user?.login}: ${comment.body}`).join("\n")}

Available tools:
- Use the get_issue tool to fetch details for any referenced GitHub issues (e.g., "Fixes #123" or "Related to #456")`,
    }

    agent.addMessage(initialMessage)

    await persistenceService.saveEvent({
      type: "llm_response",
      workflowId,
      data: {
        content: "Starting PR goal analysis",
      },
      timestamp: new Date(),
    })

    const result = await agent.runWithFunctions()

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

    updateJobStatus(jobId, "Analysis complete")
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

    updateJobStatus(jobId, `Error: ${error.message}`)
    throw error
  }
}

export default identifyPRGoal
