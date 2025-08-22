import { IssueRequirementsAgent } from "@/lib/agents/IssueRequirementsAgent"
import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { GitHubIssue, GitHubRepository } from "@/lib/types/github"

interface IssueRequirementsParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
}

export async function issueRequirements({
  issue,
  repository,
  apiKey,
  jobId,
}: IssueRequirementsParams): Promise<string> {
  const workflowId = jobId

  try {
    // Initialize workflow
    await initializeWorkflowRun({
      id: workflowId,
      type: "issueRequirements",
      issueNumber: issue.number,
      repoFullName: repository.full_name,
      postToGithub: false,
    })

    await createWorkflowStateEvent({
      workflowId,
      state: "running",
    })

    await createStatusEvent({
      workflowId,
      content: `Generating requirements for issue #${issue.number} in ${repository.full_name}`,
    })

    // Start a trace
    const trace = langfuse.trace({ name: "Issue Requirements" })
    const span = trace.span({ name: "extract_requirements" })

    const agent = new IssueRequirementsAgent({ apiKey })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "issue_requirements" })

    // Base prompt input: title + body
    await agent.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body || "(no description)"}`,
    })

    // Optionally include high-signal comments (top-level content only)
    try {
      const comments = await getIssueComments({
        repoFullName: repository.full_name,
        issueNumber: issue.number,
      })
      if (comments && comments.length > 0) {
        const formatted = comments
          .slice(0, 5) // avoid excessive context
          .map((c) => `- ${c.user?.login || "user"}: ${c.body || ""}`)
          .join("\n")
        await agent.addMessage({
          role: "user",
          content: `Relevant comments (if any):\n${formatted}`,
        })
      }
    } catch (e) {
      // Non-fatal: continue without comments
      await createStatusEvent({
        workflowId,
        content: "Proceeding without comments context",
      })
    }

    const result = await agent.runWithFunctions()

    await createWorkflowStateEvent({
      workflowId,
      state: "completed",
    })

    const last = result.messages[result.messages.length - 1]
    if (typeof last.content !== "string") {
      throw new Error(
        `Last assistant message content is not a string: ${JSON.stringify(last.content)}`
      )
    }
    return last.content
  } catch (error) {
    await createErrorEvent({ workflowId, content: String(error) })
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  }
}

export default issueRequirements

