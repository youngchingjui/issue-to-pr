import { createUpdatePullRequestBodyTool } from "@shared/lib/tools/UpdatePRTool"
import { GitHubAuthProvider } from "@shared/ports/github/auth"

import { ResponsesAPIAgent } from "@/lib/agents/base"
import { createBranchTool } from "@/lib/tools/Branch"
import { createCommitTool } from "@/lib/tools/Commit"
import { createContainerExecTool } from "@/lib/tools/ContainerExecTool"
import { createFileCheckTool } from "@/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { createSetupRepoTool } from "@/lib/tools/SetupRepoTool"
import { createSyncBranchTool } from "@/lib/tools/SyncBranchTool"
import { createWriteFileContentTool } from "@/lib/tools/WriteFileContent"
import { AgentConstructorParams, RepoEnvironment } from "@/lib/types"

const DEVELOPER_PROMPT = `
You are a senior software engineer focused on follow-up changes for an existing pull request.

Objective
- Read reviewer comments, reviews, and code-review threads for a given PR.
- Make small, targeted changes that address the feedback without altering the original intent.
- Use the provided tools to search, read, edit, and verify code. Keep commits minimal and meaningful.
- When finished, push updates to the same branch and update the pull request body.

Operating principles
1) Understand the original goal and attached issue (if any).
2) Understand the PR and feedback: skim the diff and read comments/reviews to determine concrete follow-ups.
3) Inspect before editing: search and read files first. Never modify files you haven't inspected.
4) Keep changes scoped: only address the feedback. Avoid refactors unless necessary.
5) Verify: run repository checks (type-checks, lint). Fix issues until clean.
6) Communicate: use clear commit messages summarizing what changed and why.

Required end state
- All changes committed to the existing branch.
- Branch synchronized to remote.
- Updated PR body.
`

// Narrow the allowed environment to the container variant only
type ContainerRepoEnvironment = Extract<RepoEnvironment, { kind: "container" }>

export interface DependentPRAgentParams extends AgentConstructorParams {
  env: ContainerRepoEnvironment
  defaultBranch: string
  /** GitHub repository metadata */
  owner: string
  repo: string
  /** GitHub token with push permissions (for SyncBranchTool) */
  sessionToken?: string
  jobId?: string
  /** The pull request number being updated (required for PR body updates) */
  pullNumber?: number
  /** The current/original PR body to preserve when appending updates */
  originalBody?: string
  authProvider: GitHubAuthProvider
}

export class DependentPRAgent extends ResponsesAPIAgent {
  constructor(params: DependentPRAgentParams) {
    const {
      env,
      defaultBranch,
      owner,
      repo,
      sessionToken,
      jobId,
      pullNumber,
      originalBody,
      authProvider,
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
    this.addTool(createContainerExecTool(env.name))

    // Remote tools
    try {
      if (sessionToken) {
        this.addTool(
          createSyncBranchTool(
            { owner, repo, fullName: `${owner}/${repo}` },
            env,
            sessionToken
          )
        )
      }
      // Allow the agent to update the PR body itself using the provided context
      if (pullNumber && typeof originalBody === "string") {
        this.addTool(
          createUpdatePullRequestBodyTool(
            { owner, repo, pullNumber, originalBody },
            authProvider
          )
        )
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
