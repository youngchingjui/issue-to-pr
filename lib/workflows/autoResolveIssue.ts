import { v4 as uuidv4 } from "uuid"

import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import { getAuthToken } from "@/lib/github"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { RepoEnvironment } from "@/lib/types"
import {
  GitHubIssue,
  GitHubRepository,
  RepoPermissions,
} from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

import { getUserOpenAIApiKey } from "../neo4j/services/user"

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
  let userPermissions: RepoPermissions | null = null
  let containerCleanup: (() => Promise<void>) | null = null

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

    userPermissions = await checkRepoPermissions(repository.full_name)

    const hostRepoPath = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: repository.default_branch,
      workflowId,
      hostRepoPath,
    })
    containerCleanup = cleanup

    const env: RepoEnvironment = { kind: "container", name: containerName }

    let sessionToken: string | undefined = undefined
    if (userPermissions.canPush && userPermissions.canCreatePR) {
      const tokenResult = await getAuthToken()
      sessionToken = tokenResult?.token
    }

    const trace = langfuse.trace({ name: "autoResolve" })
    const span = trace.span({ name: "agent" })

    const agent = new PlanAndCodeAgent({
      apiKey,
      env,
      defaultBranch: repository.default_branch,
      issueNumber: issue.number,
      repository,
      sessionToken,
    })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "autoResolveIssue" })

    const tree = await createContainerizedDirectoryTree(containerName)
    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    await agent.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    if (comments && comments.length > 0) {
      await agent.addMessage({
        role: "user",
        content: `Github issue comments:\n${comments
          .map(
            (c) =>
              `\n- **User**: ${c.user?.login}\n- **Created At**: ${new Date(
                c.created_at
              ).toLocaleString()}\n- **Comment**: ${c.body}`
          )
          .join("\n")}`,
      })
    }

    if (tree && tree.length > 0) {
      await agent.addMessage({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
      })
    }

    await createStatusEvent({ workflowId, content: "Running agent" })

    const result = await agent.runWithFunctions()

    await createWorkflowStateEvent({ workflowId, state: "completed" })

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
    if (containerCleanup) {
      await containerCleanup()
    }
  }
}

export default autoResolveIssue
