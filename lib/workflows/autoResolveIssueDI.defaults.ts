// Default DI bindings for the `autoResolveIssueDI` workflow.  These implementations
// simply defer to the concrete helpers that already exist in the codebase so
// that the rest of the application can continue to behave exactly as before.
//
// Keeping the default wiring in a separate module ensures that
// `autoResolveIssueDI.ts` itself remains *completely* free of imports from other
// internal packages (thereby honouring the spirit of dependency inversion).

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
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

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

const repoService: RepoService = {
  setupLocalRepository,
}

const containerService: ContainerService = {
  createWorkspace: createContainerizedWorkspace,
  createDirectoryTree: createContainerizedDirectoryTree,
}

const githubService: GitHubService = {
  checkRepoPermissions,
  getInstallationToken: getInstallationTokenFromRepo,
  getIssueComments,
}

const eventService: EventService = {
  initializeWorkflowRun,
  createWorkflowStateEvent,
  createStatusEvent,
  createErrorEvent,
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
