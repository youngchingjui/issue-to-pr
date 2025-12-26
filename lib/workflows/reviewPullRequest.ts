import { v4 as uuidv4 } from "uuid"

import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import {
  getPullRequest,
  getPullRequestDiff,
  getPullRequestReviewCommentsGraphQL,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createReviewPRTool } from "@/lib/tools/CreateDependentPRTool"
import { ReviewPRParams } from "@/lib/types"
import { auth } from "@/auth"

export async function reviewPullRequest({
  repository,
  pullNumber,
  jobId,
}: ReviewPRParams) {
  const workflowId = jobId || uuidv4()

  const session = await auth()
  const initiatorGithubLogin = session?.profile?.login ?? null

  // Initialize workflow
  await initializeWorkflowRun({
    id: workflowId,
    type: "reviewPullRequest",
    repoFullName: repository.full_name,
    initiatorGithubLogin,
  })

  await createWorkflowStateEvent({ workflowId, state: "running" })
  await createStatusEvent({ workflowId, content: "Reviewing pull request..." })

  const trace = langfuse.trace({ name: `Review PR#${pullNumber}` })
  const span = trace.span({ name: `Review PR#${pullNumber}` })

  // Load PR context
  const pr = await getPullRequest({ repoFullName: repository.full_name, pullNumber })
  const diff = await getPullRequestDiff({ repoFullName: repository.full_name, pullNumber })
  const reviewThreads = await getPullRequestReviewCommentsGraphQL({
    repoFullName: repository.full_name,
    pullNumber,
  })

  const sessionToken = await getInstallationTokenFromRepo({
    owner: repository.owner.login,
    repo: repository.name,
  })

  const tool = createReviewPRTool(
    repository,
    pullNumber,
    { kind: "container", name: repository.name },
    sessionToken
  )

  // Run review tool (placeholder)
  await tool.run({
    pr,
    diff,
    reviewThreads,
  })

  await createWorkflowStateEvent({ workflowId, state: "completed" })
}

