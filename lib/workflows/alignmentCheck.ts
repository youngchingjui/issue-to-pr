import { AlignmentAgent } from "@/lib/agents"
import { getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { getPlanWithDetails } from "@/lib/neo4j/services/plan"
import { AgentConstructorParams, Plan } from "@/lib/types"
import {
  GitHubIssue,
  IssueComment,
  PullRequest,
  PullRequestReview,
} from "@/lib/types/github"

type Params = {
  repoFullName: string
  pullNumber: number
  openAIApiKey?: string
  pr?: PullRequest
  diff?: string
  comments?: IssueComment[]
  reviews?: PullRequestReview[]
  issueNumber?: number
  plan?: Plan
  issue?: GitHubIssue
}
/**
 * Orchestrate fetching all necessary context, then invoke the inconsistency identifier agent/LLM for root-cause analysis.
 * @param options
 *   - repoFullName: string
 *   - pullNumber: number
 *   - openAIApiKey (optional): string
 */
export async function alignmentCheck({
  repoFullName,
  pullNumber,
  openAIApiKey,
  pr,
  diff,
  comments,
  reviews,
  issueNumber,
  issue,
  plan,
}: Params) {
  // 1. Fetch any missing data
  if (!pr) {
    pr = await getPullRequest({ repoFullName, pullNumber })
  }
  if (!diff) {
    diff = await getPullRequestDiff({ repoFullName, pullNumber })
  }
  if (!comments) {
    comments = await getPullRequestComments({ repoFullName, pullNumber })
  }
  if (!reviews) {
    reviews = await getPullRequestReviews({ repoFullName, pullNumber })
  }

  // Try to infer issue number -- only from provided param or GraphQL linked issues
  if (!issueNumber) {
    // 1. Try to get attached issues via GraphQL
    const linkedIssues = await getLinkedIssuesForPR({
      repoFullName,
      pullNumber,
    })
    if (linkedIssues.length > 0) {
      issueNumber = linkedIssues[0] // Use the first attached issue
    }
  }

  if (!issueNumber) {
    console.warn(
      "Could not determine the issue number for this PR. Inconsistency analysis will be limited."
    )
    return {
      success: false,
      message:
        "Could not determine the issue number for this PR. Require an attached issue to the PR.",
    }
  }

  // 2. Fetch Issue and Plan context (optional if not found, or use provided)
  if (!issue) {
    try {
      issue = await getIssue({ fullName: repoFullName, issueNumber })
    } catch (e) {
      console.error("Unable to fetch issue object:", e)
      throw e
    }
  }
  if (!plan) {
    try {
      const { plan: planObj } = await getPlanWithDetails(String(issueNumber))
      plan = planObj
    } catch (e) {
      // Plan might not exist
      console.error("Unable to fetch plan details:", e)
      throw e
    }
  }

  // 3. Init agent
  const agentParams: AgentConstructorParams = { apiKey: openAIApiKey }
  const agent = new AlignmentAgent(agentParams)

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
    console.log("[AlignmentCheck] Output:", lastMessage.content)
  } else {
    console.log("[AlignmentCheck] No output generated.")
  }

  // Return result for possible future use
  return lastMessage?.content
}
