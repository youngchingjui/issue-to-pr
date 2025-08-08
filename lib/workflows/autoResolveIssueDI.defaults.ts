// Default DI bindings for the `autoResolveIssueDI` workflow.  These implementations
// use the new shared structure with proper separation of concerns.
//
// Keeping the default wiring in a separate module ensures that
// `autoResolveIssueDI.ts` itself remains *completely* free of imports from other
// internal packages (thereby honouring the spirit of dependency inversion).

// TODO: We should probably save this in another branch or PR.
// This generally seems to be the right approach, but I'm not interested
// In adding this to the code base at the moment.
// We will definitely need this, so we need to find a way to save this in another branch to be reviewed later.

import { RepositoryService } from "shared"
import {
  AuthenticationAdapter,
  FileSystemAdapter,
  GitAdapter,
  RepositoryAdapter,
} from "shared"
import { v4 as uuidv4 } from "uuid"

import { auth } from "@/auth"
import PlanAndCodeAgent from "@/lib/agents/PlanAndCodeAgent"
import getOctokit from "@/lib/github"
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
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { getInstallationId } from "@/lib/utils/utils-server"

import type {
  AgentFactory,
  AgentFactoryContext,
  ContainerService,
  Dependencies,
  EventService,
  GitHubService,
  RepoService,
} from "./autoResolveIssueDI"

/* -------------------------------------------------------------------------- */
/*                            CONCRETE ADAPTERS                               */
/* -------------------------------------------------------------------------- */

// Create adapters
const fileSystemAdapter = new FileSystemAdapter()
const gitAdapter = new GitAdapter()
const authAdapter = new AuthenticationAdapter(
  auth,
  getOctokit,
  getInstallationId
)
const repositoryAdapter = new RepositoryAdapter(getOctokit, fileSystemAdapter)

// Create the repository service that orchestrates everything
const repositoryService = new RepositoryService(
  repositoryAdapter,
  fileSystemAdapter,
  gitAdapter,
  authAdapter
)

// Wrap the repository service to match the expected interface
const repoService: RepoService = {
  setupLocalRepository: async (params) => {
    const repository = await repositoryService.setupLocalRepository(params)
    return repository.localPath!
  },
}

const containerService: ContainerService = {
  createWorkspace: createContainerizedWorkspace,
  createDirectoryTree: createContainerizedDirectoryTree,
}

const githubService: GitHubService = {
  checkRepoPermissions,
  getInstallationToken: getInstallationTokenFromRepo,
  getIssueComments: async (params) => {
    const comments = await getIssueComments(
      params.repoFullName,
      params.issueNumber
    )
    return comments.map((comment) => ({
      body: comment.body || "",
      user: { login: comment.user?.login || "" },
      created_at: comment.created_at,
    }))
  },
}

const eventService: EventService = {
  initializeWorkflowRun: async (params) => {
    await initializeWorkflowRun(params)
  },
  createWorkflowStateEvent: async (params) => {
    await createWorkflowStateEvent(params)
  },
  createStatusEvent: async (params) => {
    await createStatusEvent(params)
  },
  createErrorEvent: async (params) => {
    await createErrorEvent(params)
  },
}

const agentFactory: AgentFactory = (ctx: AgentFactoryContext) => {
  const {
    apiKey,
    env,
    defaultBranch,
    issueNumber,
    repository,
    sessionToken,
    jobId,
  } = ctx

  const trace = langfuse.trace({ name: "autoResolve" })
  const span = trace.span({ name: "PlanAndCodeAgent" })

  const agent = new PlanAndCodeAgent({
    apiKey,
    env,
    defaultBranch,
    issueNumber,
    repository,
    sessionToken,
    jobId,
  })

  agent.addSpan({ span, generationName: "autoResolveIssueDI" })

  return agent
}

export const defaultDependencies: Dependencies = {
  repoService,
  containerService,
  githubService,
  eventService,
  agentFactory,
  uuid: uuidv4,
}
