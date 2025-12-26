import { v4 as uuidv4 } from "uuid"

import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { langfuse } from "@/lib/langfuse"
import { createStatusEvent, createWorkflowStateEvent } from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createResolveMergeConflictsTool } from "@/lib/tools/CreateDependentPRTool"
import { ResolveMergeConflictsParams } from "@/lib/types"
import { auth } from "@/auth"

export async function resolveMergeConflicts({
  repoFullName,
  pullNumber,
  apiKey,
  jobId,
}: ResolveMergeConflictsParams & { apiKey: string }) {
  const workflowId = jobId || uuidv4()

  const session = await auth()
  const initiatorGithubLogin = session?.profile?.login ?? null

  // Initialize workflow run
  await initializeWorkflowRun({
    id: workflowId,
    type: "resolveMergeConflicts",
    repoFullName,
    initiatorGithubLogin,
  })

  await createWorkflowStateEvent({ workflowId, state: "running" })
  await createStatusEvent({ workflowId, content: "Resolving merge conflicts..." })

  const trace = langfuse.trace({ name: `Resolve Conflicts PR#${pullNumber}` })
  const span = trace.span({ name: `Resolve Conflicts PR#${pullNumber}` })

  const [owner, repo] = repoFullName.split("/")
  const sessionToken = await getInstallationTokenFromRepo({ owner, repo })

  const tool = createResolveMergeConflictsTool({
    repoFullName,
    pullNumber,
    apiKey,
    env: { kind: "container", name: repo },
    sessionToken,
  })

  await tool.run({})

  await createWorkflowStateEvent({ workflowId, state: "completed" })
}

