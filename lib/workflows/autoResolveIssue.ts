import { v4 as uuidv4 } from "uuid"

import { getIssue } from "@/lib/github/issues"
import { getRepository } from "@/lib/github/repos"
import { langfuse } from "@/lib/langfuse"
import { createStatusEvent, createWorkflowStateEvent } from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { AutoResolveIssueParams } from "@/lib/types"
import { resolveIssue } from "@/lib/workflows/resolveIssue"
import { auth } from "@/auth"

export async function autoResolveIssue({
  repoFullName,
  issueNumber,
  apiKey,
}: AutoResolveIssueParams & { apiKey: string }) {
  const workflowId = uuidv4()

  const session = await auth()
  const initiatorGithubLogin = session?.profile?.login ?? null

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "autoResolveIssue",
      issueNumber,
      repoFullName,
      initiatorGithubLogin,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })
    await createStatusEvent({ workflowId, content: "Auto-resolving issue..." })

    const trace = langfuse.trace({ name: `Auto Resolve Issue #${issueNumber}` })

    const issueResult = await getIssue({ fullName: repoFullName, issueNumber })
    if (issueResult.type !== "success") throw new Error("Issue not found")

    const repo = await getRepository(repoFullName)

    await resolveIssue({
      issue: issueResult.issue,
      repository: repo,
      apiKey,
      jobId: workflowId,
      createPR: true,
    })

    await createWorkflowStateEvent({ workflowId, state: "completed" })
  } catch (error) {
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  }
}

