import { v4 as uuidv4 } from "uuid"

import { AlignmentAgent } from "@/lib/agents/alignmentAgent"
import { PostAlignmentAssessmentAgent } from "@/lib/agents/PostAlignmentAssessmentAgent"
import { getIssue } from "@/lib/github/issues"
import {
  getLinkedIssuesForPR,
  getPullRequest,
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviewCommentsGraphQL,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { listPlansForIssue } from "@/lib/neo4j/services/plan"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createIssueCommentTool } from "@/lib/tools/IssueCommentTool"
import { AgentConstructorParams, Plan } from "@/lib/types"
import {
  GitHubIssue,
  IssueComment,
  PullRequest,
  PullRequestReview,
  PullRequestReviewComment,
} from "@/lib/types/github"

type Params = {
  repoFullName: string
  pullNumber: number
  openAIApiKey: string
  pr?: PullRequest
  diff?: string
  comments?: IssueComment[]
  reviews?: PullRequestReview[]
  reviewThreads?: PullRequestReviewComment[]
  issueNumber?: number
  plan?: Plan
  issue?: GitHubIssue
  jobId?: string
}
/**
 * Orchestrate fetching all necessary context, then invoke the inconsistency identifier agent/LLM for root-cause analysis.
 * Will now also post an alignment assessment as a PR comment if postToGithub = true.
 * @param options
 *   - repoFullName: string
 *   - pullNumber: number
 *   - openAIApiKey (optional): string
 *   - postToGithub: boolean (default=false)
 */
export async function alignmentCheck({
  repoFullName,
  pullNumber,
  openAIApiKey,
  pr,
  diff,
  comments,
  reviews,
  reviewThreads,
  issueNumber,
  issue,
  plan,
  jobId,
}: Params) {
  const workflowId = jobId || uuidv4()
  try {
    // Initialize workflow run
    await initializeWorkflowRun({
      id: workflowId,
      type: "alignmentCheck",
      issueNumber,
      repoFullName,
    })
    await createWorkflowStateEvent({
      workflowId,
      state: "running",
    })
    await createStatusEvent({
      workflowId,
      content: "Starting alignment check workflow",
    })
    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: `Alignment Check PR#${pullNumber}`,
      input: {
        repoFullName,
        issueNumber,
        pullNumber,
        diff,
      },
    })
    const span = trace.span({ name: `Alignment Check PR#${pullNumber}` })

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
    // Fetch full review+threaded comments from GraphQL

    const graphqlReviewsResponse = await getPullRequestReviewCommentsGraphQL({
      repoFullName,
      pullNumber,
    })

    // If legacy reviews not provided, fallback to REST (top-level only)
    if (!reviews) {
      reviews = await getPullRequestReviews({ repoFullName, pullNumber })
    }
    // Compose both review (summary) and reviewThreads (detailed GraphQL)

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
      await createWorkflowStateEvent({
        workflowId,
        state: "error",
        content:
          "Could not determine the issue number for this PR. Require an attached issue to the PR.",
      })
      return {
        success: false,
        message:
          "Could not determine the issue number for this PR. Require an attached issue to the PR.",
      }
    }

    // 2. Fetch Issue and Plan context (optional if not found, or use provided)
    if (!issue) {
      try {
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })
        if (issueResult.type !== "success") {
          throw new Error("Failed to fetch issue")
        }
        issue = issueResult.issue
      } catch (e) {
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: "Unable to fetch issue object",
        })
        throw e
      }
    }
    if (!plan) {
      try {
        // Fetch all plans for the issue and select the latest one
        const plans = await listPlansForIssue({ repoFullName, issueNumber })
        plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        plan = plans[0] || undefined
        // TODO: In the future, associate PRs with specific planIds (e.g., via workflow run metadata)
      } catch (e) {
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: "Unable to fetch plans for issue",
        })
        throw e
      }
    }

    // 3. Init agent
    const agentParams: AgentConstructorParams = {
      apiKey: openAIApiKey,
      model: "gpt-4.1",
    }
    const agent = new AlignmentAgent(agentParams)
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "alignmentCheck" })

    // 4. Construct user input (context)
    const contextObject = {
      pr,
      diff,
      comments,
      reviewSummaries: reviews,
      reviewThreads: graphqlReviewsResponse,
      plan,
      issue,
    }
    await agent.addMessage({
      role: "user",
      content: `Analyze the following context for inconsistencies between PR review comments and the Plan/Issue.\nContext: ${JSON.stringify(contextObject)}`,
    })

    // 5. Run agent
    const response = await agent.runWithFunctions()

    span.end()

    // 6. Log output
    const lastMessage = response.messages[response.messages.length - 1]
    if (lastMessage && typeof lastMessage.content === "string") {
      await createStatusEvent({
        workflowId,
        content: lastMessage.content,
      })
      await createWorkflowStateEvent({
        workflowId,
        state: "completed",
      })
      console.log("[AlignmentCheck] Output:", lastMessage.content)
    } else {
      await createWorkflowStateEvent({
        workflowId,
        state: "completed",
        content: "No output generated.",
      })
      console.log("[AlignmentCheck] No output generated.")
    }

    // === Post alignment assessment as a PR comment, if enabled ===
    if (lastMessage && typeof lastMessage.content === "string") {
      // 1. Instantiate the agent
      const assessmentAgent = new PostAlignmentAssessmentAgent({
        apiKey: openAIApiKey,
        model: "gpt-4.1",
      })
      await assessmentAgent.addJobId(workflowId)
      assessmentAgent.addSpan({
        span,
        generationName: "postAlignmentAssessment",
      })

      const issueCommentTool = createIssueCommentTool({
        issueNumber: pr.number,
        repoFullName,
      })
      assessmentAgent.addTool(issueCommentTool)

      // 3. Add user message with all context needed for the agent
      await assessmentAgent.addMessage({
        role: "user",
        content: JSON.stringify({
          alignmentResult: lastMessage.content,
          repoFullName,
          pullNumber,
          reviewUrl: reviews?.[0]?.html_url,
        }),
      })

      // 4. Run the agent to get the comment and post it
      await assessmentAgent.runWithFunctions()
    }
    // Return result for possible future use
    return lastMessage?.content
  } catch (error) {
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  }
}
