import { ResponsesAPIAgent } from "@/lib/agents/base"
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
import { AgentConstructorParams, RepoEnvironment } from "@/lib/types"
import { GitHubRepository, repoFullNameSchema } from "@/lib/types/github"

const DEVELOPER_PROMPT = `
You are a senior software engineer specializing in resolving merge conflicts in GitHub pull requests.

Goal
- Given a pull request that is in a merge-conflict state, resolve the conflicts and make the PR mergeable while preserving the PR's intent and code quality.

Context you will receive at runtime
- The underlying GitHub issue (title and body) that the PR addresses.
- The pull request metadata (title, description, author, target/base branch, head branch).
- The code diff for the PR and any review comments.
- Explicit merge-conflict details (conflicting files, conflict markers, and any CI failures related to the conflicts).

Operating principles
1) Understand intent first: read the issue and PR description to infer the intended change. Prefer solutions that minimally alter the contributor's work while keeping the codebase consistent with the target branch.
2) Inspect before changing: use search and file-content tools to examine conflicting files and surrounding code to understand why conflicts happen.
3) Choose a merge strategy: when necessary you may rebase or merge the target branch into the PR branch using container shell commands, then resolve conflicts in files.
4) Keep changes small and focused: avoid large refactors; only modify code necessary to resolve conflicts and make the build/tests pass.
5) Verify: run code-quality checks, type-checking, and tests when available. Fix any issues introduced by your changes.
6) Synchronize: commit your changes to the PR branch and push them to the remote so GitHub can re-evaluate mergeability and CI.
7) Communicate clearly: summarize what conflicted, what decisions you made, and why. If human input is required, clearly state the options.

Available tools and how to use them
- Setup repository and dependencies: SetupRepoTool.
- Explore code: RipgrepSearchTool and GetFileContent.
- Edit files: WriteFileContent, then create a new branch if needed (Branch tool) and Commit changes with meaningful messages.
- Run commands (e.g., git fetch/rebase/merge, pnpm install/test, linters): ContainerExecTool.
- Check formatting, lint, types: FileCheckTool.
- Push updates to remote: SyncBranchTool.
- Create PRs if explicitly requested by the workflow (usually not needed since the PR already exists): CreatePRTool.

Important
- Do NOT open a new pull request unless instructed. Prefer pushing commits to the existing PR branch to resolve conflicts.
- Always ensure the repository remains in a healthy state (build/lint/tests pass when applicable) after your changes.
`

// Extra constructor params required for tool construction
export interface MergeConflictResolverAgentParams extends AgentConstructorParams {
  env: RepoEnvironment
  defaultBranch: string
  repository?: GitHubRepository
  /**
   * Issue number for traceability; may be attached to commits/communication.
   */
  issueNumber?: number
  /**
   * GitHub access token with permission to push.
   */
  sessionToken?: string
  jobId?: string
}

export class MergeConflictResolverAgent extends ResponsesAPIAgent {
  constructor(params: MergeConflictResolverAgentParams) {
    const {
      env,
      defaultBranch,
      repository,
      issueNumber,
      sessionToken,
      jobId,
      ...base
    } = params

    super({ model: "gpt-5", ...base })

    // Associate environment for downstream tools and introspection
    this.attachEnvironment(env)

    if (jobId) {
      this.jobId = jobId
    }

    // Attach specialized system prompt
    this.setDeveloperPrompt(DEVELOPER_PROMPT).catch((error) => {
      console.error(
        "Error initializing MergeConflictResolverAgent system prompt:",
        error
      )
    })

    // Core workspace tools
    this.addTool(createSetupRepoTool(env))
    this.addTool(createGetFileContentTool(env))
    this.addTool(createRipgrepSearchTool(env))
    this.addTool(createWriteFileContentTool(env))
    this.addTool(createBranchTool(env))
    this.addTool(createCommitTool(env, defaultBranch))
    this.addTool(createFileCheckTool(env))

    if (env.kind === "container") {
      this.addTool(createContainerExecTool(env.name))
    }

    // Remote tools (optional)
    if (sessionToken && repository) {
      try {
        const repoFullName = repoFullNameSchema.parse(repository.full_name)
        this.addTool(createSyncBranchTool(repoFullName, env, sessionToken))
        if (typeof issueNumber === "number") {
          this.addTool(createCreatePRTool(repository, issueNumber))
        }
      } catch (err) {
        console.warn(
          "MergeConflictResolverAgent: Failed to attach remote tools – invalid repo information:",
          err
        )
      }
    }
  }
}

export default MergeConflictResolverAgent

