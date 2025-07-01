import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createGetIssueTool } from "@/lib/tools/GetIssueTool"
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

  try {
    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Identify PR Goal",
    })
    const span = trace.span({ name: "identify_goal" })

    // Initialize workflow
    await initializeWorkflowRun({
      id: workflowId,
      type: "identifyPRGoal",
      repoFullName,
    })

    await createWorkflowStateEvent({
      workflowId,
      state: "running",
    })

    await createStatusEvent({
      workflowId,
      content: "fetching_repo",
    })

    const repo = await getRepoFromString(repoFullName)

    await createStatusEvent({
      workflowId,
      content: "Fetching PR details",
    })

    const pr = await getPullRequest({ repoFullName, pullNumber })
    const comments = await getPullRequestComments({ repoFullName, pullNumber })
    const diff = await getPullRequestDiff({ repoFullName, pullNumber })

    const agent = new GoalIdentifierAgent({
      apiKey,
    })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "identify_goal" })

    // Add the get_issue tool
    const getIssueTool = createGetIssueTool(repo)

    agent.addTool(getIssueTool)

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

    await createStatusEvent({
      workflowId,
      content: "Starting PR goal analysis",
    })

    const result = await agent.runWithFunctions()

    // Emit completion event
    await createWorkflowStateEvent({
      workflowId,
      state: "completed",
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
    await createErrorEvent({
      workflowId,
      content: String(error),
    })

    throw error
  }
}

export default identifyPRGoal
