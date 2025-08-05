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
import { createWebSearchTool } from "@/lib/tools/WebSearchTool"
import { AgentConstructorParams, RepoEnvironment } from "@/lib/types"
import { GitHubRepository, repoFullNameSchema } from "@/lib/types/github"

const DEVELOPER_PROMPT = `
You are a senior software engineer tasked with fully resolving GitHub issues.
First, analyze the issue thoroughly and brainstorm a few possible solutions. After reflecting, choose the best approach.
Then implement the necessary code changes using your available tools.
Refer to codebase configuration files to best understand coding styles, conventions, code structure and organization.
Prepare code changes and a PR that you think has the highest chance of being approved. 
Therefore, you'll probably consider running linting and testing if they exist.
Also generally it'll mean the code changes should be small and focused, and exist squarely within the scope of the issue.

IMPORTANT: Before you finish, YOU MUST create a pull request by calling the create_pull_request tool. Do NOT end the conversation until this tool has been successfully invoked.
`

// Extra constructor params required for tool construction
export interface PlanAndCodeAgentParams extends AgentConstructorParams {
  /**
   * Repository execution environment (host or container). Mandatory – most
   * tools require this.
   */
  env: RepoEnvironment
  /**
   * Default branch of the repository (e.g. "main" or "master"). Used by the
   * Commit tool to prevent committing directly to the default branch.
   */
  defaultBranch: string
  /**
   * GitHub repository metadata – required only when you want to enable tools
   * that interact with the remote (sync branch / create PR).
   */
  repository?: GitHubRepository
  /**
   * Issue number for which the agent is creating a pull-request. Only needed
   * when the PR creation tool is enabled.
   */
  issueNumber?: number
  /**
   * GitHub access token with permission to push and open PRs. Optional – if
   * omitted, remote-writing tools will not be attached.
   */
  sessionToken?: string
  jobId?: string
}

export class PlanAndCodeAgent extends ResponsesAPIAgent {
  constructor(params: PlanAndCodeAgentParams) {
    const {
      env,
      defaultBranch,
      repository,
      issueNumber,
      sessionToken,
      jobId,
      ...base
    } = params

    // Initialise base Agent (model defaults to "o3" if not overridden)
    super({ model: "o3", ...base })

    if (jobId) {
      this.jobId = jobId
    }

    // Attach developer-focused system prompt
    this.setDeveloperPrompt(DEVELOPER_PROMPT).catch((error) => {
      console.error("Error initializing PlanAndCodeAgent system prompt:", error)
    })

    /*
     * Attach core workspace tools – always useful regardless of the
     * specific workflow.
     */
    this.addTool(createSetupRepoTool(env))
    this.addTool(createGetFileContentTool(env))
    this.addTool(createRipgrepSearchTool(env))
    this.addTool(createWriteFileContentTool(env))
    this.addTool(createBranchTool(env))
    this.addTool(createCommitTool(env, defaultBranch))
    this.addTool(createFileCheckTool(env))

    // 🔍 New: OpenAI Web Search tool – enables live internet queries
    this.addTool(createWebSearchTool())

    // Container-specific utility
    if (env.kind === "container") {
      this.addTool(createContainerExecTool(env.name))
    }

    /*
     * Remote-interaction tools (optional) – only attach when we have
     * sufficient information and permissions.
     */
    if (sessionToken && repository) {
      try {
        const repoFullName = repoFullNameSchema.parse(repository.full_name)
        this.addTool(createSyncBranchTool(repoFullName, env, sessionToken))
        if (typeof issueNumber === "number") {
          this.addTool(createCreatePRTool(repository, issueNumber))
        }
      } catch (err) {
        console.warn(
          "PlanAndCodeAgent: Failed to attach remote tools – invalid repo information:",
          err
        )
      }
    }
  }
}

export default PlanAndCodeAgent

