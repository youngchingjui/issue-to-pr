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
import { createBranchTool } from "@/lib/tools/Branch"
import { createCommitTool } from "@/lib/tools/Commit"
import { createContainerExecTool } from "@/lib/tools/ContainerExecTool"
import { createCreatePRTool } from "@/lib/tools/CreatePRTool"
import { createFileCheckTool } from "@/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { createSetupRepoTool } from "@/lib/tools/SetupRepoTool"
import { createSyncBranchTool } from "@/lib/tools/SyncBranchTool"
import { createWriteFileContentTool } from "@/lib/tools/WriteFileContent"
import { RepoEnvironment } from "@/lib/types"
import {
  GitHubIssue,
  GitHubRepository,
  repoFullNameSchema,
  RepoPermissions,
} from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface AutoResolveParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
}

export const autoResolveIssue = async ({
  issue,
  repository,
  apiKey,
  jobId,
}: AutoResolveParams) => {
  const workflowId = jobId
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

    const agent = new PlanAndCodeAgent({ apiKey, model: "o3" })
    await agent.addJobId(workflowId)
    agent.addSpan({ span, generationName: "autoResolveIssue" })

    // Tools from Thinker and Coder agents
    const setupRepoTool = createSetupRepoTool(env)
    const getFileContentTool = createGetFileContentTool(env)
    const searchCodeTool = createRipgrepSearchTool(env)
    const writeFileTool = createWriteFileContentTool(env)
    const branchTool = createBranchTool(env)
    const commitTool = createCommitTool(env, repository.default_branch)
    const fileCheckTool = createFileCheckTool(env)
    const containerExecTool = createContainerExecTool(containerName)

    agent.addTool(setupRepoTool)
    agent.addTool(getFileContentTool)
    agent.addTool(searchCodeTool)
    agent.addTool(writeFileTool)
    agent.addTool(branchTool)
    agent.addTool(commitTool)
    agent.addTool(fileCheckTool)
    agent.addTool(containerExecTool)

    let syncBranchTool
    let createPRTool
    if (sessionToken) {
      syncBranchTool = createSyncBranchTool(
        repoFullNameSchema.parse(repository.full_name),
        env,
        sessionToken
      )
      createPRTool = createCreatePRTool(repository, issue.number)
      agent.addTool(syncBranchTool)
      agent.addTool(createPRTool)
    }

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
