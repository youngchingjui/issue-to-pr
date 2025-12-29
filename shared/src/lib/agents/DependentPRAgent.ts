import { ResponsesAPIAgent } from "@/shared/lib/agents/base"
import { createBranchTool } from "@/shared/lib/tools/Branch"
import { createCommitTool } from "@/shared/lib/tools/Commit"
import { createContainerExecTool } from "@/shared/lib/tools/ContainerExecTool"
import { createCreatePRTool } from "@/shared/lib/tools/CreatePRTool"
import { createFileCheckTool } from "@/shared/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/shared/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/shared/lib/tools/RipgrepSearchTool"
import { createSetupRepoTool } from "@/shared/lib/tools/SetupRepoTool"
import { createSyncBranchTool } from "@/shared/lib/tools/SyncBranchTool"
import { createWriteFileContentTool } from "@/shared/lib/tools/WriteFileContent"
import { AgentConstructorParams, RepoEnvironment } from "@/shared/lib/types"
import { GitHubRepository, repoFullNameSchema } from "@/shared/lib/types/github"

const DEVELOPER_PROMPT = `
You are a senior software engineer focused on follow-up changes for an existing pull request.

Objective
- Read reviewer comments, reviews, and code-review threads for a given PR.
- Make small, targeted changes that address the feedback without altering the original intent.
- Use the provided tools to search, read, edit, and verify code. Keep commits minimal and meaningful.
- When finished, push your dependent branch and create a new PR targeting the repository's default branch (for example, main) using the provided tool.

Operating principles
1) Understand the PR and feedback: skim the diff and read comments/reviews to determine concrete follow-ups.
2) Inspect before editing: search and read files first. Never modify files you haven't inspected.
3) Keep changes scoped: only address the feedback. Avoid refactors unless necessary.
4) Verify: run repository checks (type-checks, lint). Fix issues until clean.
5) Communicate: in the PR body, summarize what feedback you addressed and any notable decisions.

Required end state
- All changes committed on the dependent branch.
- Branch synchronized to remote.
- A PR has been created using the tool with the correct base (the repository's default branch).
`

export interface DependentPRAgentParams extends AgentConstructorParams {
  env: RepoEnvironment
  defaultBranch: string
  /** GitHub repository metadata */
  repository?: GitHubRepository
  /** Issue number that the dependent PR should close (if any) */
  issueNumber?: number
  /** GitHub token with push permissions (for SyncBranchTool) */
  sessionToken?: string
  jobId?: string
}

export class DependentPRAgent extends ResponsesAPIAgent {
  constructor(params: DependentPRAgentParams) {
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

    if (jobId) {
      this.jobId = jobId
    }

    // Attach prompt with reasoning usage enabled by Responses API
    this.setDeveloperPrompt(DEVELOPER_PROMPT).catch((error) => {
      console.error("Error initializing DependentPRAgent system prompt:", error)
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

    // Remote tools
    try {
      if (repository) {
        const repo = repoFullNameSchema.parse(repository.full_name)
        if (sessionToken) {
          this.addTool(createSyncBranchTool(repo, env, sessionToken))
        }
        // Use the original Create PR tool so that the underlying issue is appended automatically.
        this.addTool(createCreatePRTool(repository, issueNumber))
      }
    } catch (err) {
      console.warn(
        "DependentPRAgent: Failed to attach remote tools – invalid repo info:",
        err
      )
    }
  }
}

export default DependentPRAgent
