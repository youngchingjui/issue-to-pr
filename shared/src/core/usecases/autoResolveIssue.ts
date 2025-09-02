import { generateNonConflictingBranchName } from "@shared/core/usecases/generateBranchName"
import type { LLMPort } from "@shared/core/ports/llm"
import type { GitHubRefsPort } from "@shared/core/ports/refs"
import type { WorkflowReporter } from "@shared/core/ports/events"

export interface IssueLite {
  number: number
  title: string
  body?: string | null
}

export interface RepositoryLite {
  full_name: string // e.g. "owner/repo"
  default_branch: string
}

export type CommentLite = {
  user?: { login?: string | null } | null
  created_at: string | Date
  body?: string | null
}

export interface RepoEnvironmentLite {
  kind: string
  name: string
}

export type CodeAgentInput = {
  role: "user" | "assistant"
  content: string
  type: "message"
}

export interface CodeAgent {
  addInput(input: CodeAgentInput): Promise<void>
  runWithFunctions(): Promise<unknown>
}

export interface CodeAgentFactory {
  create(params: {
    apiKey: string
    env: RepoEnvironmentLite
    defaultBranch: string
    issueNumber: number
    repository: RepositoryLite
    sessionToken: string
    jobId: string
  }): CodeAgent
}

export interface PermissionsPort {
  checkRepoPermissions(repoFullName: string): Promise<{
    canPush: boolean
    canCreatePR: boolean
  }>
}

export interface WorkflowRunPort {
  initialize(params: {
    id: string
    type: "autoResolveIssue"
    issueNumber: number
    repoFullName: string
    postToGithub: boolean
  }): Promise<void>
  setState(state: "running" | "completed" | "error", content?: string): Promise<void>
}

export interface LocalRepoPort {
  setupLocalRepository(params: {
    repoFullName: string
    workingBranch: string
  }): Promise<string> // hostRepoPath
}

export interface ContainerWorkspacePort {
  createWorkspace(params: {
    repoFullName: string
    branch: string
    workflowId: string
    hostRepoPath: string
  }): Promise<{ containerName: string }>
  createDirectoryTree(containerName: string): Promise<string[]>
}

export interface GithubIssueCommentsPort {
  getIssueComments(params: {
    repoFullName: string
    issueNumber: number
  }): Promise<CommentLite[]>
}

export interface InstallationAuthPort {
  getInstallationTokenFromRepo(params: { owner: string; repo: string }): Promise<string>
}

export type AutoResolvePorts = {
  llm: LLMPort
  refs: GitHubRefsPort
  reporter: WorkflowReporter
  permissions: PermissionsPort
  workflowRun: WorkflowRunPort
  localRepo: LocalRepoPort
  workspace: ContainerWorkspacePort
  ghComments: GithubIssueCommentsPort
  installationAuth: InstallationAuthPort
  agentFactory: CodeAgentFactory
}

export type AutoResolveParams = {
  issue: IssueLite
  repository: RepositoryLite
  apiKey: string
  jobId: string
}

export async function autoResolveIssueUseCase(
  ports: AutoResolvePorts,
  { issue, repository, apiKey, jobId }: AutoResolveParams
): Promise<unknown> {
  const { reporter } = ports

  await ports.workflowRun.initialize({
    id: jobId,
    type: "autoResolveIssue",
    issueNumber: issue.number,
    repoFullName: repository.full_name,
    postToGithub: true,
  })

  await ports.workflowRun.setState("running")
  await reporter.start(`Starting auto resolve workflow for issue #${issue.number}`)

  const { canPush, canCreatePR } = await ports.permissions.checkRepoPermissions(
    repository.full_name
  )

  if (!canCreatePR || !canPush) {
    await reporter.warn(
      `Insufficient permissions to push code changes or create PR\nCan push?: ${canPush}\nCan create PR?: ${canCreatePR}`
    )
  }

  // Decide working branch
  const [owner, repo] = repository.full_name.split("/")
  let workingBranch = repository.default_branch
  try {
    const context = `GitHub issue title: ${issue.title}\n\n${issue.body ?? ""}`
    const generated = await generateNonConflictingBranchName(
      { llm: ports.llm, refs: ports.refs },
      { owner, repo, context, prefix: "feature" }
    )
    workingBranch = generated
    await reporter.status(`Using working branch: ${generated}`)
  } catch (e) {
    await reporter.warn(
      `Failed to generate non-conflicting branch name, falling back to default branch ${repository.default_branch}. Error: ${String(
        e
      )}`
    )
    workingBranch = repository.default_branch
  }

  const hostRepoPath = await ports.localRepo.setupLocalRepository({
    repoFullName: repository.full_name,
    workingBranch: repository.default_branch, // prepare default locally; branch will be created in container if needed
  })

  const { containerName } = await ports.workspace.createWorkspace({
    repoFullName: repository.full_name,
    branch: workingBranch,
    workflowId: jobId,
    hostRepoPath,
  })

  const env: RepoEnvironmentLite = { kind: "container", name: containerName }

  const sessionToken = await ports.installationAuth.getInstallationTokenFromRepo({
    owner,
    repo,
  })

  const agent = ports.agentFactory.create({
    apiKey,
    env,
    defaultBranch: repository.default_branch,
    issueNumber: issue.number,
    repository,
    sessionToken,
    jobId,
  })

  const tree = await ports.workspace.createDirectoryTree(containerName)
  const comments = await ports.ghComments.getIssueComments({
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
            `\n- **User**: ${c.user?.login ?? "unknown"}\n- **Created At**: ${new Date(
              c.created_at
            ).toLocaleString()}\n- **Comment**: ${c.body ?? ""}`
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

  await reporter.status("Running agent")

  try {
    const result = await agent.runWithFunctions()
    await ports.workflowRun.setState("completed")
    await reporter.complete("Workflow completed")
    return result
  } catch (error) {
    const msg = String(error)
    await reporter.error(msg)
    await ports.workflowRun.setState("error", msg)
    throw error
  }
}

