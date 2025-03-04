import { GoalIdentifierAgent } from "@/lib/agents"
import { getRepoFromString } from "@/lib/github/content"
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
  linkedIssue,
}: IdentifyPRGoalParams): Promise<string> {
  // Get the repository information
  const repo = await getRepoFromString(repoFullName)

  // Create the agent
  const agent = new GoalIdentifierAgent({
    repo,
    pullNumber,
    apiKey,
  })

  // Run the agent with an initial message
  const initialMessage = {
    role: "user" as const,
    content: `Please analyze PR #${pullNumber} ${
      linkedIssue ? `and its linked issue #${linkedIssue.number}` : ""
    } to identify its goals and objectives.${
      linkedIssue
        ? "\n\nMake sure to analyze whether the PR's changes align with the linked issue's requirements."
        : ""
    }`,
  }

  return agent.run([initialMessage])
}

export default identifyPRGoal
