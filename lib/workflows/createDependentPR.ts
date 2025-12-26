import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { langfuse } from "@/lib/langfuse"
import { createStatusEvent, createWorkflowStateEvent } from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createCreateDependentPRTool } from "@/lib/tools/CreateDependentPRTool"
import { CreateDependentPRParams, repoFullNameSchema } from "@/lib/types"
import { auth } from "@/auth"

export async function createDependentPR({
  repository,
  issueNumber,
  parentPullNumber,
  dependencyTitle,
  jobId,
}: CreateDependentPRParams) {
  const workflowId = jobId

  // Best-effort initiator attribution from session
  const session = await auth()
  const initiatorGithubLogin = session?.profile?.login ?? null

  await initializeWorkflowRun({
    id: workflowId,
    type: "createDependentPR",
    issueNumber,
    repoFullName: repository.full_name,
    initiatorGithubLogin,
  })

  await createWorkflowStateEvent({ workflowId, state: "running" })
  await createStatusEvent({ workflowId, content: "Creating dependent PR..." })

  const trace = langfuse.trace({ name: "Create Dependent PR" })
  const span = trace.span({ name: "createDependentPR" })

  const sessionToken = await getInstallationTokenFromRepo({
    owner: repository.owner.login,
    repo: repository.name,
  })

  const tool = createCreateDependentPRTool(
    repository,
    issueNumber,
    parentPullNumber,
    dependencyTitle,
    { kind: "container", name: repoFullNameSchema.parse(repository.full_name) },
    sessionToken
  )

  // Execute the tool's operation
  await tool.run({})

  await createWorkflowStateEvent({ workflowId, state: "completed" })
}

