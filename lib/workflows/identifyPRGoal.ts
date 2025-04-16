import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { GetIssueTool } from "@/lib/tools"
import { GitHubIssue } from "@/lib/types/github"

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
  const workflowId = jobId
  const persistenceService = new WorkflowPersistenceService()

  try {
    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Identify PR Goal",
    })
    const span = trace.span({ name: "identify_goal" })

    // Emit workflow start event
    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: `Starting identifyPRGoal workflow for PR #${pullNumber} in ${repoFullName}`,
      },
      timestamp: new Date(),
    })

    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: "fetching_repo",
      },
      timestamp: new Date(),
    })

    const repo = await getRepoFromString(repoFullName)

    await persistenceService.saveEvent({
      type: "status",
      workflowId,
      data: {
        status: "fetching_pr_details",
      },
      timestamp: new Date(),
    })

    const pr = await getPullRequest({ repoFullName, pullNumber })
    const comments = await getPullRequestComments({ repoFullName, pullNumber })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

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

    await agent.addMessage(initialMessage)

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
      type: "status",
      workflowId,
      data: {
        status: "completed",
        success: true,
      },
      timestamp: new Date(),
    })

    const lastMessage = result.messages[result.messages.length - 1]
    if (typeof lastMessage.content !== "string") {
      throw new Error(
        `Last message content is not a string. Here's the content: ${JSON.stringify(
          lastMessage.content
        )}`
      )
    }
    return lastMessage.content
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

export default identifyPRGoal
