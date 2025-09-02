import { v4 as uuidv4 } from "uuid"

import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import { GitHubRefsAdapter } from "@/lib/adapters/GitHubRefsAdapter"
import { BasicLLMAdapter } from "@/lib/adapters/BasicLLMAdapter"
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
import { generateNonConflictingBranchName } from "@shared/core/usecases/generateBranchName"

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
    try {
      const llm = new BasicLLMAdapter()
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

