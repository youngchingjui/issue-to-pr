// This file contains a re-implementation of the auto resolve issue workflow
// that follows a dependency-injection (DI) friendly design.
//
// The workflow itself **does not** import any concrete services from the rest of
// the codebase.  Instead it operates exclusively on a set of clearly defined
// interfaces that are provided by the caller.  This keeps the workflow pure and
// easy to unit-test while also making it possible to plug-in alternative
// implementations (e.g. mocks, stubs, remote services, etc.).
//
// NOTE:  A set of default, production-ready implementations can be found in
// `lib/workflows/autoResolveIssueDI.defaults.ts`.  These wire the abstract
// interfaces below to the existing concrete helpers that live elsewhere in the
// repository.

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

// TODO: We should probably save this in another branch or PR.
// This generally seems to be the right approach, but I'm not interested
// In adding this to the code base at the moment.
// We will definitely need this, so we need to find a way to save this in another branch to be reviewed later.

export interface RepoService {
  /**
   * Clones / prepares a local copy of the repository and returns the absolute
   * path on the host file-system.
   */
  setupLocalRepository(params: {
    repoFullName: string
    workingBranch: string
  }): Promise<string>
}

export interface ContainerService {
  /**
   * Spins-up a new container with the repository mounted inside.
   */
  createWorkspace(params: {
    repoFullName: string
    branch: string
    workflowId: string
    hostRepoPath: string
  }): Promise<{ containerName: string }>

  /**
   * Produces a tree representation (list of file / directory paths) for the
   * repository inside the container.
   */
  createDirectoryTree(containerName: string): Promise<string[]>
}

export interface GitHubService {
  /** Checks whether the current credentials allow us to push and create PRs. */
  checkRepoPermissions(repoFullName: string): Promise<{
    canPush: boolean
    canCreatePR: boolean
  }>

  /** Returns an installation token for the GitHub App installation. */
  getInstallationToken(params: { owner: string; repo: string }): Promise<string>

  /** List comments for the given issue. */
  getIssueComments(params: {
    repoFullName: string
    issueNumber: number
  }): Promise<{ body: string; user: { login: string }; created_at: string }[]>
}

export interface EventService {
  initializeWorkflowRun(params: {
    id: string
    type: string
    issueNumber: number
    repoFullName: string
    postToGithub: boolean
  }): Promise<void>

  createWorkflowStateEvent(params: {
    workflowId: string
    state: "running" | "completed" | "error"
    content?: string
  }): Promise<void>

  createStatusEvent(params: {
    workflowId: string
    content: string
  }): Promise<void>

  createErrorEvent(params: {
    workflowId: string
    content: string
  }): Promise<void>
}

export interface AgentInput {
  role: "user" | "system"
  content: string
  type: "message"
}

export interface Agent {
  addInput(input: AgentInput): Promise<void>
  run(): Promise<unknown>
}

export interface AgentFactoryContext {
  env: { kind: "container"; name: string }
  defaultBranch: string
  issueNumber: number
  repository: {
    full_name: string
    default_branch: string
    // any other repository fields the agent needs can be indexed here
    [key: string]: unknown
  }
  sessionToken: string
  jobId: string
  apiKey: string
}

export type AgentFactory = (context: AgentFactoryContext) => Agent

export interface Dependencies {
  repoService: RepoService
  containerService: ContainerService
  githubService: GitHubService
  eventService: EventService
  agentFactory: AgentFactory
  /** uuid generator */
  uuid: () => string
}

/* -------------------------------------------------------------------------- */
/*                              WORKFLOW LOGIC                                */
/* -------------------------------------------------------------------------- */

interface Params {
  issue: {
    number: number
    title: string
    body: string
  }
  repository: {
    full_name: string
    default_branch: string
    [key: string]: unknown
  }
  /** If not provided we will attempt to obtain it via other means. */
  apiKey: string
  /** Optional external job / workflow id. */
  jobId?: string
}

export const autoResolveIssueDI = async (
  { issue, repository, apiKey, jobId }: Params,
  deps: Dependencies
) => {
  const {
    repoService,
    containerService,
    githubService,
    eventService,
    agentFactory,
    uuid,
  } = deps

  const workflowId = jobId ?? uuid()

  // --- bookkeeping -------------------------------------------------------- //
  await eventService.initializeWorkflowRun({
    id: workflowId,
    type: "autoResolveIssue",
    issueNumber: issue.number,
    repoFullName: repository.full_name,
    postToGithub: true,
  })

  await eventService.createWorkflowStateEvent({
    workflowId,
    state: "running",
  })

  await eventService.createStatusEvent({
    workflowId,
    content: `Starting auto resolve workflow for issue #${issue.number}`,
  })

  // --- permissions -------------------------------------------------------- //
  const { canPush, canCreatePR } = await githubService.checkRepoPermissions(
    repository.full_name
  )

  if (!canPush || !canCreatePR) {
    await eventService.createStatusEvent({
      workflowId,
      content: `[WARNING]: Insufficient permissions to push code changes or create PR\nCan push?: ${canPush}\nCan create PR?: ${canCreatePR}`,
    })
  }

  try {
    // --- repository preparation ------------------------------------------ //
    const hostRepoPath = await repoService.setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    // --- container workspace --------------------------------------------- //
    const { containerName } = await containerService.createWorkspace({
      repoFullName: repository.full_name,
      branch: repository.default_branch,
      workflowId,
      hostRepoPath,
    })

    const env = { kind: "container" as const, name: containerName }

    // --- github app token ------------------------------------------------- //
    const [owner, repo] = repository.full_name.split("/")
    const sessionToken = await githubService.getInstallationToken({
      owner,
      repo,
    })

    // --- agent setup ------------------------------------------------------ //
    const agent = agentFactory({
      env,
      defaultBranch: repository.default_branch,
      issueNumber: issue.number,
      repository,
      sessionToken,
      jobId: workflowId,
      apiKey,
    })

    // --- gather context --------------------------------------------------- //
    const tree = await containerService.createDirectoryTree(containerName)
    const comments = await githubService.getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    // --- prime agent ------------------------------------------------------ //
    await agent.addInput({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
      type: "message",
    })

    if (comments?.length) {
      const formatted = comments
        .map(
          (c) =>
            `\n- **User**: ${c.user.login}\n- **Created At**: ${new Date(
              c.created_at
            ).toLocaleString()}\n- **Comment**: ${c.body}`
        )
        .join("\n")

      await agent.addInput({
        role: "user",
        content: `Github issue comments:${formatted}`,
        type: "message",
      })
    }

    if (tree?.length) {
      await agent.addInput({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
        type: "message",
      })
    }

    await eventService.createStatusEvent({
      workflowId,
      content: "Running agent",
    })

    // --- execute agent ---------------------------------------------------- //
    const result = await agent.run()

    await eventService.createWorkflowStateEvent({
      workflowId,
      state: "completed",
    })

    return result
  } catch (error) {
    const content = (error as Error)?.message ?? String(error)
    await eventService.createErrorEvent({ workflowId, content })
    await eventService.createWorkflowStateEvent({
      workflowId,
      state: "error",
      content,
    })
    throw error
  }
}

export default autoResolveIssueDI
