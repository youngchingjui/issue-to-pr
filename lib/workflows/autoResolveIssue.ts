import { OpenAIAdapter } from "shared/adapters/llm/OpenAIAdapter"
import { EventBusPort } from "shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "shared/ports/events/publisher"
import { SettingsReaderPort } from "shared/ports/repositories/settings.reader"
import { generateNonConflictingBranchName } from "shared/usecases/git/generateBranchName"
import { v4 as uuidv4 } from "uuid"

import { GitHubRefsAdapter } from "@/lib/adapters/GitHubRefsAdapter"
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
  /** User GitHub login, in order to lookup their OpenAI API key */
  login: string
  jobId?: string
  /** Optional branch to run the workflow on. If omitted, a new feature branch is generated. */
  branch?: string
}

interface AutoResolveIssuePorts {
  settings: SettingsReaderPort
  eventBus?: EventBusPort
}
export const autoResolveIssue = async (
  params: Params,
  ports: AutoResolveIssuePorts
) => {
  const { issue, repository, login, jobId, branch } = params
  const { settings, eventBus } = ports

  // =================================================
  // Step 0: Setup workflow publisher
  // =================================================
  const workflowId = jobId ?? uuidv4()
  const pub = createWorkflowEventPublisher(eventBus, workflowId)

  // =================================================
  // Step 1: Get API key
  // =================================================

  const apiKeyResult = await settings.getOpenAIKey(login)
  if (!apiKeyResult.ok || !apiKeyResult.value) {
    pub.workflow.error("No API key provided and no user settings found")
    throw new Error("No API key provided and no user settings found")
  }
  const apiKey = apiKeyResult.value

  // =================================================
  // Step 2: Initialize workflow
  // =================================================

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

    // Decide the working branch first so we can set labels and network aliases on the container
    const [owner, repo] = repository.full_name.split("/")
    let workingBranch = repository.default_branch

    if (branch && branch.trim().length > 0) {
      workingBranch = branch.trim()
      await createStatusEvent({
        workflowId,
        content: `Using provided branch: ${workingBranch}`,
      })
    } else {
      try {
        // TODO: This is super messy.
        // This workflow is supposed to be a use case.
        // Here, we're calling another use case within the use case.
        // As well as importing adapters directly in the use case.
        // This should not happen.
        // Either this use case needs to be called outside this use case independently
        // Or we combine in internals of generateNonConflictingBranchName into this use case
        const llm = new OpenAIAdapter(apiKey)
        const refs = new GitHubRefsAdapter()
        const context = `GitHub issue title: ${issue.title}\n\n${issue.body ?? ""}`
        const generated = await generateNonConflictingBranchName(
          { llm, refs },
          { owner, repo, context, prefix: "feature" }
        )
        workingBranch = generated
        await createStatusEvent({
          workflowId,
          content: `Using working branch: ${generated}`,
        })
      } catch (e) {
        await createStatusEvent({
          workflowId,
          content: `[WARNING]: Failed to generate non-conflicting branch name, falling back to default branch ${repository.default_branch}. Error: ${String(
            e
          )}`,
        })
        workingBranch = repository.default_branch
      }
    }

    const hostRepoPath = await setupLocalRepository({
      repoFullName: repository.full_name,
      // Always prepare local repo on the default branch to ensure fetch/checkout succeeds,
      // we will create/switch to the workingBranch inside the container as needed.
      workingBranch: repository.default_branch,
    })

    const { containerName } = await createContainerizedWorkspace({
      repoFullName: repository.full_name,
      branch: workingBranch,
      workflowId,
      hostRepoPath,
    })

    const env: RepoEnvironment = { kind: "container", name: containerName }

    const sessionToken = await getInstallationTokenFromRepo({
      owner,
      repo,
    })

    const trace = langfuse.trace({ name: "autoResolve" })
    const span = trace.span({ name: "PlanAndCodeAgent" })

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

    return result
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

export default autoResolveIssue
