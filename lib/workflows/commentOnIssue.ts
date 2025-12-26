import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createLLMResponseEvent,
  createStatusEvent,
  createSystemPromptEvent,
  createUserMessageEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { asRepoEnvironment } from "@/lib/types"
import { GitHubIssue, GitHubRepository } from "@/lib/types/github"
import { createContainerizedWorkspace } from "@/lib/utils/container"
import { defaultCommentOnIssueSystemPrompt } from "@/lib/utils/utils-server"
import { auth } from "@/auth"

export const commentOnIssue = async ({
  issue,
  repository,
  apiKey,
  jobId,
}: {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
}) => {
  const workflowId = jobId

  try {
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: repository.default_branch,
      workflowId,
    })

    // Best-effort initiator attribution from session
    const session = await auth()
    const initiatorGithubLogin = session?.profile?.login ?? null

    await initializeWorkflowRun({
      id: workflowId,
      type: "commentOnIssue",
      issueNumber: issue.number,
      repoFullName: repository.full_name,
      initiatorGithubLogin,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    const trace = langfuse.trace({ name: "commentOnIssue" })

    const content = `Issue from Github: ${issue.title} - ${issue.body}`

    await createSystemPromptEvent({
      workflowId,
      content: defaultCommentOnIssueSystemPrompt,
    })

    await createUserMessageEvent({ workflowId, content })

    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    if (comments && comments.length > 0) {
      const commentsContent = `Github issue comments:\n${comments
        .map(
          (comment) =>
            `\n- **User**: ${comment.user?.login}\n- **Created At**: ${new Date(comment.created_at).toLocaleString()}\n- **Reactions**: ${comment.reactions ? comment.reactions.total_count : 0}\n- **Comment**: ${comment.body}\n`
        )
        .join("\n")}`

      await createUserMessageEvent({
        workflowId,
        content: commentsContent,
      })
    }

    await createStatusEvent({
      workflowId,
      content: `Should it leave a comment? ${repository.full_name} - ${issue.title}`,
    })

    const { completion } = await fetch("/api/openai/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        issue,
        content,
        additionalContext: JSON.stringify({
          repoInfo: repository,
          baseDir: asRepoEnvironment({ kind: "container", name: containerName }),
        }),
      }),
    })
      .then((res) => res.json())
      .catch((err) => {
        throw new Error(String(err))
      })

    await createLLMResponseEvent({ workflowId, content: completion })

    await createStatusEvent({
      workflowId,
      content: "Workflow completed successfully.",
    })

    await createWorkflowStateEvent({ workflowId, state: "completed" })

    await cleanup()

    return completion
  } catch (error) {
    await createErrorEvent({
      workflowId,
      content: String(error),
    })

    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })

    throw error
  }
}

