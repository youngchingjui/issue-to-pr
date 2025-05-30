import { InconsistencyIdentifierAgent } from "@/lib/agents/inconsistencyIdentifier"
import { getIssue } from "@/lib/github/issues"
import {
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { getPlanWithDetails } from "@/lib/neo4j/services/plan"
import { AgentConstructorParams } from "@/lib/types"

/**
 * Orchestrate fetching all necessary context, then invoke the inconsistency identifier agent/LLM for root-cause analysis.
 * @param options
 *   - repoFullName: string
 *   - pullNumber: number
 *   - openAIApiKey (optional): string
 */
export async function identifyInconsistencies({
  repoFullName,
  pullNumber,
  openAIApiKey,
}: {
  repoFullName: string
  pullNumber: number
  openAIApiKey?: string
}) {
  // 1. Fetch PR data
  const pr = await getPullRequest({ repoFullName, pullNumber })
  const diff = await getPullRequestDiff({ repoFullName, pullNumber })
  const comments = await getPullRequestComments({ repoFullName, pullNumber })
  const reviews = await getPullRequestReviews({ repoFullName, pullNumber })

  // Try to infer issue number -- look for "Closes #<issue>" in PR body, else fallback to the PR's issue_url
  let issueNumber: number | undefined = undefined

  // Try to infer from PR body
  const closesMatch = pr.body && pr.body.match(/Closes #(\d+)/i)
  if (closesMatch && closesMatch[1]) {
    issueNumber = Number(closesMatch[1])
  } else if (pr.issue_url) {
    const parts = pr.issue_url.split("/")
    const n = Number(parts[parts.length - 1])
    if (!isNaN(n)) issueNumber = n
  }

  if (!issueNumber) {
    console.warn(
      "Could not determine the issue number for this PR. Inconsistency analysis will be limited."
    )
  }

  // 2. Fetch Issue and Plan context (optional if not found)
  let issue = null,
    plan = null
  if (issueNumber) {
    try {
      issue = await getIssue({ fullName: repoFullName, issueNumber })
    } catch (e) {
      console.warn("Unable to fetch issue object:", e)
    }
    try {
      const { plan: planObj } = await getPlanWithDetails(String(issueNumber))
      plan = planObj
    } catch (e) {
      // Plan might not exist
      console.warn("Unable to fetch plan details:", e)
    }
  }

  // 3. Init agent
  const agentParams: AgentConstructorParams = { apiKey: openAIApiKey }
  const agent = new InconsistencyIdentifierAgent(agentParams)

  // 4. Construct user input (context)
  const contextObject = {
    pr,
    diff,
    comments,
    reviews,
    plan,
    issue,
  }
  await agent.addMessage({
    role: "user",
    content: `Analyze the following context for inconsistencies between PR review comments and the Plan/Issue.\nContext: ${JSON.stringify(contextObject)}`,
  })

  // 5. Run agent
  const response = await agent.runWithFunctions()

  // 6. Log output
  const lastMessage = response.messages[response.messages.length - 1]
  if (lastMessage && typeof lastMessage.content === "string") {
    console.log("[IDENTIFIED INCONSISTENCIES]", lastMessage.content)
  } else {
    console.log("[IDENTIFIED INCONSISTENCIES] No output generated.")
  }

  // Return result for possible future use
  return lastMessage?.content
}
