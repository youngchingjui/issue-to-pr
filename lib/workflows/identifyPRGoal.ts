import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import { GetIssueTool } from "@/lib/tools"
import { GitHubIssue } from "@/lib/types"
import { updateJobStatus } from "@/lib/utils"

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
  // Start a trace for this workflow
  const trace = langfuse.trace({
    name: "Identify PR Goal",
  })
  const span = trace.span({ name: "identify_goal" })

  try {
    // Add status updates throughout the workflow
    updateJobStatus(jobId, "Fetching repository information...")
    const repo = await getRepoFromString(repoFullName)

    updateJobStatus(jobId, "Retrieving PR details and comments...")
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
    const result = await agent.runWithFunctions()
    updateJobStatus(jobId, "Analysis complete")
    return result
  } catch (error) {
    updateJobStatus(jobId, `Error: ${error.message}`)
    throw error
  }
}

export default identifyPRGoal
