import { v4 as uuidv4 } from "uuid"

import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import { GitHubIssue, GitHubRepository } from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface Params {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey?: string
  jobId?: string
}

export const autoResolveIssue = async ({
  issue,
  repository,
  apiKey,
  jobId,
}: Params) => {
  if (!apiKey) {
    const apiKeyFromSettings = await getUserOpenAIApiKey()

    if (!apiKeyFromSettings) {
      throw new Error("No API key provided and no user settings found")
    }

    apiKey = apiKeyFromSettings
  }

  const workflowId = jobId ?? uuidv4()

  // Langfuse trace & span setup
  const trace = langfuse.trace({ name: "autoResolve" })
  const span = trace.span({ name: "PlanAndCodeAgent" })
  let spanClosed = false

  try {
    await initializeWorkflowRun({
      id: workflowId,
      type: "autoResolveIssue",
      issueNumber: issue.number,
      repoFullName: repository.full_name,
      postToGithub: true,
    })

    await createWorkflowStateEvent({ workflowId, state: "running" })

    await createStatusEvent({
      workflowId,
      content: `Starting auto resolve workflow for issue #${issue.number}`,
    })

    const { canPush, canCreatePR } = await checkRepoPermissions(
      repository.full_name
    )

    if (!canCreatePR || !canPush) {
      await createStatusEvent({
        workflowId,
        content: `[WARNING]: Insufficient permissions to push code changes or create PR\nCan push?: ${canPush}\nCan create PR?: ${canCreatePR}`,
      })
    }

    const hostRepoPath = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    const { containerName } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: repository.default_branch,
      workflowId,
      hostRepoPath,
    })

    const env: RepoEnvironment = { kind: "container", name: containerName }

    const [owner, repo] = repository.full_name.split("/")
    const sessionToken = await getInstallationTokenFromRepo({
      owner,
      repo,
    })

    const agent = new PlanAndCodeAgent({
      apiKey,
      env,
      defaultBranch: repository.default_branch,
      issueNumber: issue.number,
      repository,
      sessionToken,
      jobId: workflowId,
    })
    agent.addSpan({ span, generationName: "autoResolveIssue" })

    const tree = await createContainerizedDirectoryTree(containerName)
    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    await agent.addInput({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
      type: "message",
    })

    if (comments && comments.length > 0) {
      await agent.addInput({
        role: "user",
        content: `Github issue comments:\n${comments
          .map(
            (c) =>
              `\n- **User**: ${c.user?.login}\n- **Created At**: ${new Date(
                c.created_at
              ).toLocaleString()}\n- **Comment**: ${c.body}`
          )
          .join("\n")}`,
        type: "message",
      })
    }

    if (tree && tree.length > 0) {
      await agent.addInput({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
        type: "message",
      })
    }

    await createStatusEvent({ workflowId, content: "Running agent" })

    const result = await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })

    // Close the Langfuse span to ensure data gets flushed
    span.end()
    spanClosed = true

    return result
  } catch (error) {
    await createErrorEvent({ workflowId, content: String(error) })
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })
    throw error
  } finally {
    // Make sure the span is always closed, even on error paths
    if (!spanClosed) {
      try {
        span.end()
      } catch {
        /* ignore */
      }
    }
  }
}

export default autoResolveIssue

