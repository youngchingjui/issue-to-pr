import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequest,
  getPullRequestComments,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import { GetIssueTool } from "@/lib/tools"
import { GitHubIssue } from "@/lib/types"

interface IdentifyPRGoalParams {
  repoFullName: string
  pullNumber: number
  apiKey: string
  linkedIssue?: GitHubIssue
}

export async function identifyPRGoal({
  repoFullName,
  pullNumber,
  apiKey,
}: IdentifyPRGoalParams): Promise<string> {
  // Start a trace for this workflow
  const trace = langfuse.trace({
    name: "Identify PR Goal",
  })
  const span = trace.span({ name: "identify_goal" })

  // Get the repository information
  const repo = await getRepoFromString(repoFullName)

  // Get PR details and comments
  const pr = await getPullRequest({ repoFullName, pullNumber })
  const comments = await getPullRequestComments({ repoFullName, pullNumber })

  // Create the agent
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
    content: `Please analyze the following pull request to identify its goals and objectives:

Title: ${pr.title}
Description:
${pr.body || "(No description provided)"}

Number of comments: ${comments.length}
Comments:
${comments.map((comment) => `- ${comment.user?.login}: ${comment.body}`).join("\n")}

Please identify:
1. The primary goal of these changes
2. Any secondary objectives or side effects
3. If you find any references to GitHub issues (e.g., "Fixes #123" or "Related to #456"), use the get_issue tool to fetch and analyze those issues
4. Whether the changes align with any linked issues you find
5. Any changes that seem unrelated to the main goal

You have access to:
- The PR's diff through the get_pr_goal tool
- Issue details through the get_issue tool when you find issue references`,
  }

  agent.addMessage(initialMessage)
  return await agent.runWithFunctions()
}

export default identifyPRGoal
