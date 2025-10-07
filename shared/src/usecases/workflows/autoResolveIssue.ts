// TODO: This should be called "resolveIssue". Slowly replace the existing "resolveIssue" workflow with this one.
// Note: I'm just throwing all functions in this file for quick migration for now.
// We should slowly rearrange and factor as we go along
// To match our desired architecture.

import { AsyncLocalStorage } from "node:async_hooks"

import { createAppAuth } from "@octokit/auth-app"
import { createOAuthUserAuth } from "@octokit/auth-oauth-user"
import { graphql } from "@octokit/graphql"
import { components } from "@octokit/openapi-types"
import { Octokit } from "@octokit/rest"
import { exec } from "child_process"
import { exec as hostExec } from "child_process"
import * as fs from "fs/promises"
import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import Langfuse from "langfuse"
import { App } from "octokit"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"
import {
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  ResponseInputItem,
} from "openai/resources/responses/responses"
import { FunctionTool } from "openai/resources/responses/responses"
import path from "path"
import { buildPreviewSubdomainSlug } from "shared/entities/previewSlug"
import type { GitHubRefsPort } from "shared/ports/refs"
import util from "util"
import { v4 as uuidv4 } from "uuid"
import { ZodType } from "zod"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import { OpenAIAdapter } from "@/adapters/llm/OpenAIAdapter"
import { auth } from "@/auth"
import {
  WorkflowStateEventSchema,
  WorkflowStatusEventSchema,
} from "@/entities/events/WorkflowEvent"
import {
  execInContainerWithDockerode,
  startContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { writeFileInContainer } from "@/lib/docker"
import { getLocalRepoDir } from "@/lib/fs"
import { writeFile } from "@/lib/fs"
import {
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
  ensureValidRepo,
  setRemoteOrigin,
} from "@/lib/git"
import {
  createErrorEvent,
  createLLMResponseEvent,
  createReasoningEvent,
  createStatusEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  createWorkflowStateEvent,
  deleteEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createBranchTool } from "@/lib/tools/Branch"
import { createCommitTool } from "@/lib/tools/Commit"
import { createContainerExecTool } from "@/lib/tools/ContainerExecTool"
import { createCreatePRTool } from "@/lib/tools/CreatePRTool"
import { createFileCheckTool } from "@/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { EventBusPort } from "@/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@/ports/events/publisher"
import { SettingsReaderPort } from "@/ports/repositories/settings.reader"
import { generateNonConflictingBranchName } from "@/usecases/git/generateBranchName"
import { withTiming } from "@/utils/telemetry"

/**********************************************
 *
 *
 * TODO: Refactor all of the copied functions below and move to another file
 *
 *
 **********************************************/

type CreateToolParams<Schema extends ZodType, Output> = {
  name: string
  description: string
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<Output> | Output
}

export const createTool = <Schema extends ZodType, Output>({
  name,
  description,
  schema,
  handler,
}: CreateToolParams<Schema, Output>): Tool<Schema, Output> => {
  return {
    type: "function" as const,
    function: {
      name,
      parameters: zodToJsonSchema(schema),
      description,
      type: "function",
    },
    schema,
    // Accept input shape and parse to apply defaults before calling the user handler
    handler: (params: z.input<Schema>) => handler(schema.parse(params)),
  }
}

// Input schema for setup commands
const setupRepoParameters = z.object({
  cliCommand: z
    .string()
    .describe(
      "Single-line shell command needed to set up the repository after cloning (e.g., npm install, pip install -r requirements.txt, poetry install, yarn, etc.)."
    ),
})

async function createSetupRepoHandler(
  env: RepoEnvironment,
  params: z.infer<typeof setupRepoParameters>
) {
  const { cliCommand } = params

  // Reject multi-line commands
  if (/\r|\n/.test(cliCommand)) {
    return {
      stdout: "",
      stderr:
        "Multi-line commands are not allowed. Only single-line setup commands.",
      exitCode: 1,
    }
  }

  try {
    if (env.kind === "host") {
      const { exec } = await import("child_process")
      const { promisify } = await import("util")
      const execPromise = promisify(exec)
      const { stdout, stderr } = await execPromise(cliCommand, {
        cwd: env.root,
        maxBuffer: 1024 * 1024,
      })
      return { stdout, stderr, exitCode: 0 }
    } else {
      const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
        name: env.name,
        command: cliCommand,
      })
      return { stdout, stderr, exitCode }
    }
  } catch (error: unknown) {
    if (!error || typeof error !== "object") {
      return {
        stdout: "",
        stderr: String(error ?? "Unknown error"),
        exitCode: -1,
      }
    }

    const err = error as {
      stdout?: string
      stderr?: string
      code?: number
      message?: string
    }

    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "Setup command failed.",
      exitCode: typeof err.code === "number" ? err.code : 1,
    }
  }
}

function createSetupRepoTool(
  arg: string | RepoEnvironment
): Tool<
  typeof setupRepoParameters,
  { stdout: string; stderr: string; exitCode: number }
> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "setup_repo",
    description: `
        Run a repository setup CLI command (e.g., '\''npm install'\'', '\''pip install -r requirements.txt'\'', '\''poetry install'\'', etc.).
        PURPOSE: Use this tool to set up the repository environment (install dependencies, initialize environments, etc) so that you may successfully run the FileCheck tool. Some file check commands may require the repository to be set up first.
        GUIDELINES:
          1. READ files like README.md, package.json, requirements.txt before using this tool.
          2. ONLY use for setup commands—not for build, test, or code-quality checks.
          3. ONLY single-line commands are allowed.
      `,
    schema: setupRepoParameters,
    handler: (params: z.infer<typeof setupRepoParameters>) =>
      createSetupRepoHandler(env, params),
  })
}

type HttpLikeError = { status?: number }

class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

async function checkBranchExists(
  repoFullName: string,
  branch: string
): Promise<boolean> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  try {
    await withTiming(
      `GitHub REST: repos.getBranch ${repoFullName}:${branch}`,
      () =>
        octokit.rest.repos.getBranch({
          owner,
          repo,
          branch,
        })
    )
    return true
  } catch (error: unknown) {
    const http = error as HttpLikeError | undefined
    if (!error) {
      throw new GitHubError("An unknown error occurred.", 500)
    }

    if (http && typeof http === "object" && "status" in http) {
      switch (http.status) {
        case 404:
          return false
        default:
          throw new GitHubError(`Failed to check branch exists: ${error}`, 500)
      }
    }

    throw error
  }
}
const execPromise = util.promisify(exec)

async function pushBranch(
  branchName: string,
  cwd: string | undefined = undefined,
  token?: string,
  repoFullName?: string
): Promise<string> {
  let oldRemoteUrl: string | null = null
  try {
    if (token && repoFullName) {
      // Get current origin URL
      const { stdout: originalUrl } = await execPromise(
        "git remote get-url origin",
        { cwd }
      )
      oldRemoteUrl = originalUrl.trim()
      // Set authenticated remote
      const authenticatedUrl = getCloneUrlWithAccessToken(repoFullName, token)
      await execPromise(`git remote set-url origin "${authenticatedUrl}"`, {
        cwd,
      })
    }
    const command = `git push origin ${branchName}`
    const { stdout } = await execPromise(command, { cwd })
    return stdout
  } finally {
    // Restore the original remote if we changed it
    if (token && repoFullName && oldRemoteUrl) {
      try {
        await execPromise(`git remote set-url origin "${oldRemoteUrl}"`, {
          cwd,
        })
      } catch (e) {
        // Fail quietly, as this is cleanup
        console.error(`[ERROR] Failed to restore original remote: ${e}`)
      }
    }
  }
}

const syncBranchParameters = z.object({
  branch: z
    .string()
    .describe(
      "The name of the branch to push to remote. If not provided, pushes the current branch."
    ),
})

type SyncBranchParams = z.infer<typeof syncBranchParameters>

type BranchCreationResult = {
  status: BranchCreationStatus
  message: string
}

enum BranchCreationStatus {
  Success,
  BranchAlreadyExists,
  NetworkError,
  Unauthorized,
  UnknownError,
}

async function createBranch(
  fullRepo: string,
  branch: string,
  baseBranch: string = "main"
): Promise<BranchCreationResult> {
  const octokit = await getOctokit()
  const [owner, repo] = fullRepo.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  if (!octokit) {
    throw new Error("No octokit found")
  }

  try {
    // Get the latest commit SHA of the base branch
    const { data: baseBranchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: baseBranch,
    })

    // Create a new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseBranchData.commit.sha,
    })

    return {
      status: BranchCreationStatus.Success,
      message: `Branch '${branch}' created successfully.`,
    }
  } catch (error) {
    if (!error) {
      return {
        status: BranchCreationStatus.UnknownError,
        message: "An unknown error occurred.",
      }
    }

    if (typeof error === "object" && "status" in error) {
      switch (error.status) {
        case 422:
          return {
            status: BranchCreationStatus.BranchAlreadyExists,
            message: `Branch '${branch}' already exists. Error: ${error}`,
          }
        case 401:
          return {
            status: BranchCreationStatus.Unauthorized,
            message: "Unauthorized access. Please check your credentials.",
          }
        case 404:
        default:
          return {
            status: BranchCreationStatus.UnknownError,
            message: `An unknown error occurred. Error: ${error}`,
          }
      }
    }
    return {
      status: BranchCreationStatus.UnknownError,
      message: "An unknown error occurred.",
    }
  }
}

async function createSyncBranchHandler(
  repoFullName: RepoFullName,
  env: RepoEnvironment,
  params: SyncBranchParams,
  token: string
): Promise<string> {
  const { branch } = params
  try {
    // Create branch on remote if it doesn't exist
    const branchExists = await checkBranchExists(repoFullName.fullName, branch)
    if (!branchExists) {
      const branchCreationResult = await createBranch(
        repoFullName.fullName,
        branch
      )
      if (
        branchCreationResult.status === BranchCreationStatus.BranchAlreadyExists
      ) {
        return JSON.stringify({
          status: "error",
          message: branchCreationResult.message,
        })
      }
    }
    if (env.kind === "host") {
      await pushBranch(branch, env.root, token, repoFullName.fullName)
    } else {
      // Ensure the 'origin' remote embeds authentication
      const authenticatedUrl = getCloneUrlWithAccessToken(
        repoFullName.fullName,
        token
      )

      // Set remote URL with credentials before pushing
      const { exitCode: setUrlExit, stderr: setUrlErr } =
        await execInContainerWithDockerode({
          name: env.name,
          command: `git remote set-url origin "${authenticatedUrl}"`,
        })
      if (setUrlExit !== 0) {
        return JSON.stringify({
          status: "error",
          message: `Failed to set authenticated remote: ${setUrlErr}`,
        })
      }

      const { exitCode, stderr } = await execInContainerWithDockerode({
        name: env.name,
        command: `git push origin ${branch}`,
      })
      if (exitCode !== 0) {
        return JSON.stringify({
          status: "error",
          message: `Failed to push branch to remote: ${stderr}`,
        })
      }
    }
    return JSON.stringify({
      status: "success",
      message: `Successfully pushed branch '${branch}' to remote`,
    })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Failed to push branch to remote: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
function createSyncBranchTool(
  repoFullName: RepoFullName,
  baseDir: string,
  token: string
): Tool<typeof syncBranchParameters, string>
function createSyncBranchTool(
  repoFullName: RepoFullName,
  env: RepoEnvironment,
  token: string
): Tool<typeof syncBranchParameters, string>
function createSyncBranchTool(
  repoFullName: RepoFullName,
  arg: string | RepoEnvironment,
  token: string
): Tool<typeof syncBranchParameters, string> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "sync_branch_to_remote",
    description:
      "Pushes the current branch and its commits to the remote GitHub repository. Similar to 'git push origin HEAD'. Will create the remote branch if it doesn't exist.",
    schema: syncBranchParameters,
    handler: (params: SyncBranchParams) =>
      createSyncBranchHandler(repoFullName, env, params, token),
  })
}

/**
 * Helper to normalize legacy baseDir string to RepoEnvironment
 */
function asRepoEnvironment(arg: string | RepoEnvironment): RepoEnvironment {
  return typeof arg === "string"
    ? { kind: "host", root: arg } // auto-wrap legacy baseDir
    : arg
}

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

async function createWriteFileHandler(
  env: RepoEnvironment,
  params: WriteFileContentParams
): Promise<string> {
  const { relativePath, content } = params

  if (env.kind === "host") {
    const fullPath = path.join(env.root, relativePath)
    await writeFile(fullPath, content)
    return `File written successfully to ${relativePath}`
  } else {
    // Container environment using Docker helper
    const { exitCode, stderr } = await writeFileInContainer({
      name: env.name,
      workdir: env.mount ?? "/workspace",
      relPath: relativePath,
      contents: content,
      makeDirs: true,
    })

    if (exitCode !== 0) {
      throw new Error(`Failed to write file: ${stderr}`)
    }

    return `File written successfully to ${relativePath}`
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
function createWriteFileContentTool(
  baseDir: string
): Tool<typeof writeFileContentParameters, string>
function createWriteFileContentTool(
  env: RepoEnvironment
): Tool<typeof writeFileContentParameters, string>
function createWriteFileContentTool(
  arg: string | RepoEnvironment
): Tool<typeof writeFileContentParameters, string> {
  const env = asRepoEnvironment(arg)

  return createTool({
    name: "write_file",
    description: "Writes content to a file in the repository",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) =>
      createWriteFileHandler(env, params),
  })
}

// ---- Repo Environment Type ----
// Represents where repository operations are executed – either directly on the host
// file-system or inside a named Docker container (optionally with a different mount path).
type RepoEnvironment =
  | { kind: "host"; root: string }
  | { kind: "container"; name: string; mount?: string }

// Agents
type AgentConstructorParams = {
  model?: ChatModel
  systemPrompt?: string
  apiKey?: string
}

// Events
const eventTypes = z.enum([
  "error",
  "llmResponse",
  "llmResponseWithPlan",
  "message",
  "reasoning",
  "reviewComment",
  "status",
  "systemPrompt",
  "toolCall",
  "toolCallResult",
  "userMessage",
  "workflowState",
])

const baseEventSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  workflowId: z.string(),
  content: z.string().optional(),
  type: eventTypes,
})

const errorEventSchema = baseEventSchema.extend({
  type: z.literal("error"),
  content: z.string(),
})
const llmResponseSchema = baseEventSchema.merge(
  z.object({
    type: z.literal("llmResponse"),
    content: z.string(),
    model: z
      .string()
      .optional()
      .describe("String description of LLM model used to generate response"),
  })
)

// Plans
const planSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(["draft", "approved", "rejected"]),
  version: z.number(),
  createdAt: z.date(),
  editMessage: z.string().optional(),
})

const planMetaSchema = planSchema.omit({
  content: true,
  createdAt: true,
})

const llmResponseWithPlanSchema = baseEventSchema.merge(
  z.object({
    type: z.literal("llmResponseWithPlan"),
    content: z.string(),
    plan: planMetaSchema,
  })
)

const systemPromptSchema = baseEventSchema.extend({
  type: z.literal("systemPrompt"),
  content: z.string(),
})

const userMessageSchema = baseEventSchema.extend({
  type: z.literal("userMessage"),
  content: z.string(),
})

const reasoningEventSchema = baseEventSchema.extend({
  type: z.literal("reasoning"),
  // New field for all new events
  summary: z.string().optional(),
  // Legacy support: allow old events that used `content`
  content: z.string().optional(),
})

const toolCallSchema = baseEventSchema.extend({
  type: z.literal("toolCall"),
  toolName: z.string(),
  toolCallId: z.string(),
  args: z.string(),
})

const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  toolCallId: z.string(),
  toolName: z.string(),
  content: z.string(),
})

const reviewCommentSchema = baseEventSchema.extend({
  type: z.literal("reviewComment"),
  content: z.string(),
  planId: z.string(),
})

const messageEventSchema = z.discriminatedUnion("type", [
  userMessageSchema,
  systemPromptSchema,
  llmResponseSchema,
  llmResponseWithPlanSchema,
  reasoningEventSchema,
  toolCallSchema,
  toolCallResultSchema,
])

const anyEventSchema = z.discriminatedUnion("type", [
  ...messageEventSchema.options,
  errorEventSchema,
  reviewCommentSchema,
  WorkflowStatusEventSchema,
  WorkflowStateEventSchema,
])

type AnyEvent = z.infer<typeof anyEventSchema>

// Tools
interface Tool<Schema extends ZodType, Output> {
  type: "function"
  function: {
    name: string
    parameters: Record<string, unknown>
    description: string
    type: "function"
  }
  schema: Schema
  handler: (params: z.input<Schema>) => Promise<Output> | Output
}

type EnhancedMessage = ChatCompletionMessageParam & {
  id?: string
  timestamp?: Date
}

// Default image name and literal type
const DEFAULT_AGENT_BASE_IMAGE = "ghcr.io/youngchingjui/agent-base" as const

// Image name that can be overridden via environment variable
const AGENT_BASE_IMAGE: string =
  process.env.AGENT_BASE_IMAGE ?? DEFAULT_AGENT_BASE_IMAGE

/**
 * Derive the deterministic container name used by our workflow utilities.
 * Must stay in sync with container naming logic across the application.
 *
 * @param traceId - The workflow trace/run ID
 * @returns The standardized container name
 */
function containerNameForTrace(traceId: string): string {
  return `agent-${traceId}`.replace(/[^a-zA-Z0-9_.-]/g, "-")
}

// Promisified exec for host-side commands (e.g., docker cp)
const execHost = util.promisify(hostExec)

interface ContainerizedWorktreeResult {
  worktreeDir: string
  containerName: string
  /** Execute a command in the container */
  exec: (
    command: string
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  /** Clean up container and worktree */
  cleanup: () => Promise<void>
  workflowId: string
}

interface ContainerizedWorktreeOptions {
  /** e.g. "owner/repo" */
  repoFullName: string
  /** branch to check out for the worktree (default "main") */
  branch?: string
  /** optional externally-supplied workflow run id */
  workflowId?: string
  /** Docker image to use (default "ghcr.io/youngchingjui/agent-base") */
  image?: string
  /** Mount path inside container (default "/workspace") */
  mountPath?: string
  /** Optional path to a local repository directory to copy into the container */
  hostRepoPath?: string
}

// ---- Git identity defaults ----
const DEFAULT_GIT_USER_NAME = "Issue To PR agent"
const DEFAULT_GIT_USER_EMAIL = "agent@issuetopr.dev"

/**
 * Creates a directory tree listing from within a container, replicating the logic
 * from lib/fs.ts createDirectoryTree but executing in the containerized environment.
 *
 * Excludes:
 * - node_modules directories
 * - Hidden files and folders (starting with .)
 * - Directories themselves (only files are included)
 */
async function createContainerizedDirectoryTree(
  containerName: string,
  containerDir: string = "/workspace"
): Promise<string[]> {
  /*
    Builds a list of file paths inside the container using the `tree` CLI.

    We leverage the `tree` command that is installed in our agent base image
    (see `docker/agent-base/Dockerfile`).  The options used:

    -a   : include hidden files as well
    -f   : print the full path prefix for each file
    -i   : no indentation lines (produces a plain list)
    --noreport : omit the summary line at the end

    By executing the command with `cwd` set to `containerDir`, the output
    paths are relative to that directory.  Directories are suffixed with a
    trailing `/` which we filter out so the resulting array contains only
    file paths.
  */

  const treeCommand = "tree -afi --noreport" // list all files/directories, absolute paths off

  try {
    const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
      name: containerName,
      command: treeCommand,
      cwd: containerDir,
    })

    if (exitCode !== 0) {
      console.warn(`Directory tree generation failed: ${stderr}`)
      return []
    }

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.endsWith("/") && line !== ".")
  } catch (error) {
    console.warn(`Failed to create directory tree: ${error}`)
    return []
  }
}

/**
 * Sets up a Docker container with the repository cloned inside the container itself (no host worktree).
 * This mirrors the manual workflow described by the user: a fresh container, Git credentials
 * configured via the passed GitHub token, followed by cloning the repository inside /workspace.
 *
 * Compared to createContainerizedWorktree, this approach does NOT rely on git worktrees mounted
 * from the host. All git operations happen entirely inside the container.
 *
 * Git operations will be attributed to the Github App, not the user, so we use our Github App installation credentials
 */
async function createContainerizedWorkspace({
  repoFullName,
  branch = "main",
  workflowId = uuidv4(),
  image = AGENT_BASE_IMAGE,
  mountPath = "/workspace",
  hostRepoPath,
}: ContainerizedWorktreeOptions): Promise<ContainerizedWorktreeResult> {
  const [ownerRaw, repoRaw] = repoFullName.split("/")
  const owner = ownerRaw ?? ""
  const repo = repoRaw ?? ""
  const token = await getInstallationTokenFromRepo({ owner, repo })

  // 2. Start a detached container with GITHUB_TOKEN env set
  const containerName = containerNameForTrace(workflowId)

  const subdomain = buildPreviewSubdomainSlug({ branch, owner, repo })
  const ttlHours = Number.parseInt(process.env.CONTAINER_TTL_HOURS ?? "24", 10)

  await startContainer({
    image,
    name: containerName,
    user: "root",
    env: {
      GITHUB_TOKEN: token,
    },
    workdir: mountPath,
    labels: {
      preview: "true",
      repo,
      owner,
      branch,
      ...(Number.isFinite(ttlHours) ? { "ttl-hours": String(ttlHours) } : {}),
      subdomain,
    },
    network: {
      name: "preview",
      aliases: subdomain ? [subdomain] : [],
    },
  })

  // 3. Helper exec wrapper
  const exec = async (command: string) =>
    await execInContainerWithDockerode({
      name: containerName,
      command,
      cwd: mountPath,
    })

  // 4. Configure Git inside the container
  await exec(`git config --global user.name "${DEFAULT_GIT_USER_NAME}"`)
  await exec(`git config --global user.email "${DEFAULT_GIT_USER_EMAIL}"`)
  await exec("git config --global credential.helper store")
  await exec(
    'sh -c "printf \"https://%s:x-oauth-basic@github.com\\n\" \"$GITHUB_TOKEN\" > ~/.git-credentials"'
  )

  // If a host repository directory is provided, copy it into the container to
  // avoid another network clone. Fallback to git clone when not provided.
  if (hostRepoPath) {
    // Ensure destination directory exists inside container
    await exec(`mkdir -p ${mountPath}`)

    // Copy contents (including hidden files) from hostRepoPath -> container
    // Use docker cp with trailing /. to copy directory contents, not parent dir
    await execHost(
      `docker cp "${hostRepoPath}/." ${containerName}:${mountPath}`
    )

    // Fix ownership of the repository inside the container to avoid
    // Git "dubious ownership" warnings caused by mismatched host UIDs.
    await exec(`chown -R root:root ${mountPath}`)

    // Ensure we are on the desired branch, create it if it doesn't exist
    await exec(`git fetch origin || true`)
    const checkoutRes = await exec(`git checkout ${branch}`)
    if (checkoutRes.exitCode !== 0) {
      await exec(`git checkout -b ${branch}`)
    }
  } else {
    // 5. Clone the repository and checkout the requested branch
    await exec(`git clone https://github.com/${repoFullName} ${mountPath}`)
    await exec(`git fetch origin || true`)
    const checkoutRes = await exec(`git checkout ${branch}`)
    if (checkoutRes.exitCode !== 0) {
      await exec(`git checkout -b ${branch}`)
    }
  }

  // 6. Cleanup helper
  const cleanup = async () => {
    await stopAndRemoveContainer(containerName)
  }

  // Reuse ContainerizedWorktreeResult type for compatibility. worktreeDir now represents the
  // repository root inside the container (mountPath).
  return {
    worktreeDir: mountPath,
    containerName,
    exec,
    cleanup,
    workflowId,
  }
}

/**
 * Converts a custom Tool interface to OpenAI's FunctionTool format.
 *
 * This utility function transforms your internal Tool interface (which includes
 * schema and handler) to the FunctionTool format expected by OpenAI's API.
 * It extracts the function definition and handles type compatibility.
 *
 * @param tool - The custom Tool to convert
 * @returns FunctionTool object suitable for OpenAI API calls
 */
function convertToolToFunctionTool<Schema extends ZodType, Output>(
  tool: Tool<Schema, Output>
): FunctionTool {
  return {
    name: tool.function.name,
    parameters: tool.function.parameters,
    description: tool.function.description,
    type: "function",
    strict: null, // Default to null as per OpenAI's FunctionTool interface
  }
}

// GitHub API Types
type GitHubRepository = components["schemas"]["full-repository"]
type AuthenticatedUserRepository = components["schemas"]["repository"]
type GitHubIssue = components["schemas"]["issue"]
type GitHubIssueComment = components["schemas"]["issue-comment"]

// Repository-specific types
const repoFullNameSchema = z
  .string()
  .regex(
    /^[^/]+\/[^/]+$/,
    "'Repository name must be in the format 'owner/repo'"
  )
  .transform((str) => {
    const [owner, repo] = str.split("/")
    return {
      owner,
      repo,
      fullName: str,
    }
  })

type RepoFullName = z.infer<typeof repoFullNameSchema>

// Repository permissions types
interface RepoPermissions {
  canPush: boolean
  canCreatePR: boolean
  reason?: string
}

type ExtendedOctokit = Octokit & { authType: "user" | "app" }

function getCloneUrlWithAccessToken(userRepo: string, token: string): string {
  // userRepo format is "username/repo"
  // GitHub App installation tokens (prefix "ghs_") must be passed as the password with
  // a fixed username `x-access-token`, per GitHub documentation:
  //docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#about-authentication-as-a-github-app-installation
  // For all other tokens (e.g. OAuth or personal access tokens like `ghp_` or `github_pat_`),
  // embedding the token directly as the username continues to work.
  if (token.startsWith("ghs_")) {
    // Treat as GitHub App installation token -> username is fixed, token is password
    return `https://x-access-token:${token}@github.com/${userRepo}.git`
  }

  // Default behaviour for PAT / OAuth tokens
  return `https://${token}@github.com/${userRepo}.git`
}

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

// TODO: We currently depend on webhooks to provide installation IDs.
// BUT, we should also save installation IDs to neo4j database on the first time we retrieve them.
// They are unique to:
//   - Our Github App (dev-issue-to-pr (local testing) or issuetopr-dev (production)) (confusing, I know)
//   - user / org
function getInstallationId(): string | null {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    return null
  }
  return store.installationId
}

/**
 * Prepare a local working copy of a GitHub repository.
 *
 * This helper makes sure that the repository identified by `repoFullName` is
 * available in a local working directory that the server can freely mutate.
 * The steps performed are:
 * 1. Resolve (and lazily create) the base directory via `getLocalRepoDir`.
 * 2. Build an authenticated clone URL using either the user's
 *    GitHub App token (OAuth or installation token) exposed
 *    through `runWithInstallationId` / `getInstallationId`.
 * 3. Verify that the local repository is healthy via `ensureValidRepo`; if it
 *    is corrupt or missing, attempt a fresh clone.
 * 4. Ensure the local repo's "origin" remote uses the authenticated URL so
 *    subsequent fetches succeed.
 * 5. Perform a clean checkout of `workingBranch`, retrying up to three times
 *    and re-cloning when necessary.
 *
 * The function is resilient to transient git failures and cleans up the local
 * directory on unrecoverable errors.
 *
 * @param {Object} params                           - Function parameters.
 * @param {string} params.repoFullName              - Full repository name in
 *                                                   the form "owner/repo".
 * @param {string} [params.workingBranch="main"]   - Branch to check out for
 *                                                   subsequent operations.
 * @returns {Promise<string>} Absolute path to the prepared local repository
 *                            directory.
 * @throws {Error} If the repository cannot be prepared after all retries.
 */
async function setupLocalRepository({
  repoFullName,
  workingBranch = "main",
}: {
  repoFullName: string
  workingBranch?: string
}): Promise<string> {
  // Get or create a local directory to work off of
  const baseDir = await getLocalRepoDir(repoFullName)

  try {
    let cloneUrl: string

    // 1. Determine an authenticated clone URL
    const session = await auth()
    if (session?.token?.access_token) {
      cloneUrl = getCloneUrlWithAccessToken(
        repoFullName,
        session.token.access_token as string
      )
    } else {
      // Fallback to GitHub App authentication
      const octokit = await getOctokit()
      if (!octokit) {
        throw new Error("Failed to get authenticated Octokit instance")
      }

      const [owner, repo] = repoFullName.split("/")
      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo,
      })

      cloneUrl = repoData.clone_url as string

      const installationId = getInstallationId()
      if (installationId) {
        const token = (await octokit.auth({
          type: "installation",
          installationId: Number(installationId),
        })) as { token: string }
        cloneUrl = getCloneUrlWithAccessToken(repoFullName, token.token)
      }
    }

    // 2. Ensure repository exists and is healthy
    await ensureValidRepo(baseDir, cloneUrl)

    // 3. Always make sure the "origin" remote points to our authenticated URL
    try {
      await setRemoteOrigin(baseDir, cloneUrl)
    } catch (e) {
      // Not fatal; log and continue. Subsequent operations may still work.
      console.warn(`[WARNING] Failed to set authenticated remote: ${e}`)
    }

    // 4. Clean checkout with retries
    let retries = 3
    while (retries > 0) {
      try {
        await cleanCheckout(workingBranch, baseDir)
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.error(
            `[ERROR] Failed to clean checkout after retries: ${error}`
          )
          throw error
        }
        console.warn(
          `[WARNING] Clean checkout failed, retrying... (${retries} attempts left)`
        )
        await cleanupRepo(baseDir)
        await cloneRepo(cloneUrl, baseDir)
      }
    }

    return baseDir
  } catch (error) {
    console.error(`[ERROR] Failed to setup repository: ${error}`)
    // Clean up on failure
    await cleanupRepo(baseDir)
    throw error
  }
}

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
})

/**
 * Check if the currently authenticated user has the right permissions on the
 * provided repository.  The function **never throws** for the common "repo not
 * found / not installed" case because the caller should be able to rely on the
 * boolean flags instead of handling exceptions.
 */
async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  try {
    const repos = await listUserAppRepositories()

    // Find the repository matching the provided full name ("owner/repo")
    const repoData = repos.find((r) => r.full_name === repoFullName)

    // If the repository is not returned from the GitHub App installation list
    // we treat it as "not found / not installed" and **do not throw**.  This
    // allows consumers to render proper UI messages without having to perform
    // exception control-flow.
    if (!repoData) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "Repository not found or not installed for the GitHub App.",
      }
    }

    const { permissions } = repoData

    if (!permissions) {
      // This should not normally happen – log & propagate as an error because
      // it indicates an unexpected response shape from GitHub.
      throw new Error(`There were no permissions, strange: ${permissions}`)
    }

    const canPush = permissions.push || permissions.admin || false
    const canCreatePR = permissions.pull || permissions.admin || false

    if (!canPush && !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "Insufficient permissions. User needs push access to create branches and pull request access to create PRs.",
      }
    }

    return {
      canPush,
      canCreatePR,
      reason:
        canPush && canCreatePR ? undefined : "Limited permissions available",
    }
  } catch (error) {
    // Other errors (network, auth, etc.) are still surfaced so that calling
    // code can decide how to handle them.
    console.error("Error checking repository permissions:", error)
    throw new Error(
      `Failed to check permissions: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Returns a deduplicated list of repositories that the current user can access **and**
 * that have the Issue-to-PR GitHub App installed.
 *
 * Workflow:
 * 1. Fetch the user's installations via OAuth (`GET /user/installations`).
 * 2. For each installation, use the OAuth user token to query repositories **that the user can access within that installation**.
 * 3. In parallel, list repositories accessible to the user for that installation (`GET /user/installations/{installation_id}/repositories`).
 * 4. Merge & deduplicate the results by `nameWithOwner`.
 */
async function listUserAppRepositories(): Promise<
  AuthenticatedUserRepository[]
> {
  // Step 1 – Fetch all installations for the authenticated user
  const installations = await getUserInstallations()

  if (!Array.isArray(installations) || installations.length === 0) {
    return []
  }

  // Step 2 & 3 – For every installation, list repositories the **user** can access within that installation *in parallel*
  const userOctokit = await getUserOctokit()

  const reposByInstallation = await Promise.all(
    installations.map(async (installation: { id: number }) => {
      try {
        const {
          data: { repositories },
        } = await userOctokit.request(
          "GET /user/installations/{installation_id}/repositories",
          { installation_id: installation.id, per_page: 100 }
        )

        return repositories
      } catch (error) {
        console.error(
          `[github/repos] Failed to list repositories for installation ${installation.id}:`,
          error
        )
        return []
      }
    })
  )

  // Flatten the array of arrays into a single list
  const allRepos = reposByInstallation.flat()

  // Step 4 – Deduplicate by `nameWithOwner`
  const uniqueReposMap = new Map<string, (typeof allRepos)[0]>()
  for (const repo of allRepos) {
    if (!uniqueReposMap.has(repo.full_name)) {
      uniqueReposMap.set(repo.full_name, repo)
    }
  }

  return Array.from(uniqueReposMap.values())
}

/**
 * Helper for the user profile page: returns the UNION of
 *  - repositories owned by the target username (public + what the API exposes)
 *  - repositories that have our GitHub App installed AND are owned by the target username
 *
 * This avoids surfacing app-installed repositories owned by other users/orgs
 * when viewing a specific user's profile.
 */

async function getInstallationFromRepo({
  owner,
  repo,
}: {
  owner: string
  repo: string
}) {
  const app = await getAppOctokit()

  const result = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    {
      owner,
      repo,
    }
  )

  return result
}

interface BranchByCommitDate {
  name: string
  committedDate: Date
}

type GraphQLResponse = {
  repository: {
    refs: {
      nodes: Array<{
        name: string
        target: { committedDate: Date }
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
}

/**
 * Fetches branches for a given repository sorted by their latest commit date (descending).
 * Utilises GitHub's GraphQL API so that all required data can be retrieved in a single request.
 *
 * @param repoFullName The repository's full name in the format "owner/repo".
 * @param limit Optional max number of branches to return. Defaults to 20.
 * @returns A list of branches sorted by commit date (most recent first).
 */
async function listBranchesSortedByCommitDate(
  repoFullName: RepoFullName,
  limit?: number // Optional: if provided, return only up to this many branches, else return all
): Promise<BranchByCommitDate[]> {
  const { owner, repo } = repoFullName

  const graphql = await getGraphQLClient()
  if (!graphql) {
    throw new Error("No authenticated GraphQL client available")
  }

  const query = `
    query ($owner: String!, $repo: String!, $pageSize: Int!, $after: String) {
      repository(owner: $owner, name: $repo) {
        refs(
          refPrefix: \"refs/heads/\",
          first: $pageSize,
          after: $after
        ) {
          nodes {
            name
            target {
              ... on Commit {
                committedDate
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `

  const allBranches: BranchByCommitDate[] = []
  let hasNextPage = true
  let after: string | null = null
  const pageSize = 100 // GitHub GraphQL max page size

  while (hasNextPage) {
    const response = await graphql<GraphQLResponse>(query, {
      owner,
      repo,
      pageSize,
      after,
    })

    const nodes = response.repository.refs.nodes
    for (const n of nodes) {
      if (n.target?.committedDate) {
        allBranches.push({
          name: n.name,
          committedDate: n.target.committedDate,
        })
      }
    }

    hasNextPage = response.repository.refs.pageInfo.hasNextPage
    after = response.repository.refs.pageInfo.endCursor

    if (limit && allBranches.length >= limit) {
      break
    }
  }

  // Ensure correct sorting just in case the API doesn't respect the order
  allBranches.sort(
    (a, b) =>
      new Date(b.committedDate).getTime() - new Date(a.committedDate).getTime()
  )

  if (limit) {
    return allBranches.slice(0, limit)
  }
  return allBranches
}

async function getIssueComments({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<GitHubIssueComment[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  })
  return comments.data as GitHubIssueComment[]
}

async function getPrivateKeyFromFile(): Promise<string> {
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (!privateKeyPath) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_PATH is not set")
  }
  return await fs.readFile(privateKeyPath, "utf8")
}

/**
 * Creates an authenticated Octokit client using one of two authentication methods:
 * 1. User Authentication: Tries to use the user's session token first
 * 2. GitHub App Authentication: Falls back to using GitHub App credentials (private key + app ID)
 *    if user authentication fails
 *
 * Returns either an authenticated Octokit instance or null if both auth methods fail
 *
 * @deprecated Use getUserOctokit or getInstallationOctokit instead
 */
async function getOctokit(): Promise<ExtendedOctokit | null> {
  const session = await auth()

  if (session?.token?.access_token) {
    const userOctokit = new Octokit({ auth: session.token.access_token })

    return { ...userOctokit, authType: "user" }
  }

  // Fallback to GitHub App authentication
  const appId = process.env.GITHUB_APP_ID

  if (!appId) {
    throw new Error("GITHUB_APP_ID is not set")
  }

  try {
    const privateKey = await getPrivateKeyFromFile()

    // Assuming you have the installation ID from the webhook or other source
    const installationId = getInstallationId()
    if (!installationId) {
      return null
    }

    const installationOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })

    return { ...installationOctokit, authType: "app" }
  } catch (error) {
    console.error("[ERROR] Failed to setup GitHub App authentication:", error)
    return null
  }
}

/**
 * Creates an authenticated GraphQL client using Github App Authentication
 */
async function getGraphQLClient(): Promise<typeof graphql | null> {
  const octokit = await getOctokit()

  if (!octokit) {
    return null
  }

  return octokit.graphql
}

/**
 * Creates an authenticated Octokit client using the OAuth user authentication strategy.
 * This function uses the existing session tokens from NextAuth to authenticate with GitHub.
 *
 * This is an alternative to getUserOctokit() that uses the @octokit/auth-oauth-user strategy
 * instead of directly passing the access token to the Octokit constructor.
 *
 * @returns An authenticated Octokit instance or throws an error if authentication fails
 */
async function getUserOctokit() {
  const session = await auth()

  if (!session?.token?.access_token) {
    throw new Error("No session token found")
  }

  if (typeof session.token.access_token !== "string") {
    throw new Error("Access token is not a string")
  }

  // `clientId` and `clientSecret` are already determined by
  // auth.js library when authenticating user in `auth.js`.
  // No need to add them here, as they're inferred in the `access_token`
  const userOctokit = new Octokit({
    authStrategy: createOAuthUserAuth,
    auth: {
      clientType: "github-app",
      token: session.token.access_token,
    },
  })

  return userOctokit
}

async function getUserInstallations() {
  const octokit = await getUserOctokit()

  const { data: installations } = await octokit.request(
    "GET /user/installations"
  )

  return installations.installations
}

async function getInstallationOctokit(installationId: number) {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()

  const installationOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })

  return installationOctokit
}

async function getAppOctokit() {
  const appId = process.env.GITHUB_APP_ID
  if (!appId) throw new Error("GITHUB_APP_ID is not set")

  const privateKey = await getPrivateKeyFromFile()
  const app = new App({
    appId,
    privateKey,
  })
  return app
}

/**
 * Retrieves the Github installation token for a given repo
 * Assumes the repo has the Github App installed to its owner account / org
 */
async function getInstallationTokenFromRepo({
  owner,
  repo,
}: {
  owner: string
  repo: string
}) {
  const installation = await getInstallationFromRepo({ owner, repo })
  const installationOctokit = await getInstallationOctokit(installation.data.id)
  const auth = await installationOctokit.auth({ type: "installation" })

  // Narrow the `auth` value (it comes back as `unknown`) and ensure it has a
  // `token` property that is a string.  If any of these checks fail we bail out
  // early with a descriptive error so we never proceed with an invalid token
  // shape.
  if (
    !auth ||
    typeof auth !== "object" ||
    !("token" in auth) ||
    typeof auth.token !== "string"
  ) {
    throw new Error(
      `Invalid authentication response while trying to retrieve the installation token for ${owner + "/" + repo}: ${auth}`
    )
  }

  return auth.token
}

interface RunResponse {
  jobId?: string
  startTime: Date
  endTime: Date
  messages: EnhancedMessage[]
}

class Agent {
  REQUIRED_TOOLS: string[] = []
  messages: EnhancedMessage[] = []
  private untrackedMessages: EnhancedMessage[] = [] // Queue for untracked messages
  tools: Tool<ZodType, unknown>[] = []
  llm: OpenAI | null = null
  model: ChatModel = "gpt-5"
  jobId?: string

  constructor({ model, systemPrompt, apiKey }: AgentConstructorParams) {
    if (model) {
      this.model = model
    }
    if (apiKey) {
      this.addApiKey(apiKey)
    }
    if (systemPrompt) {
      this.setSystemPrompt(systemPrompt)
    }
  }

  private async trackMessage(
    message: ChatCompletionMessageParam
  ): Promise<string | undefined> {
    if (!this.jobId) return

    let eventId: string | undefined

    if (message.role === "system" && typeof message.content === "string") {
      const event = await createSystemPromptEvent({
        workflowId: this.jobId,
        content: message.content,
      })
      eventId = event.id
    } else if (message.role === "user" && typeof message.content === "string") {
      const event = await createUserResponseEvent({
        workflowId: this.jobId,
        content: message.content,
      })
      eventId = event.id
    } else if (
      message.role === "assistant" &&
      typeof message.content === "string"
    ) {
      const event = await createLLMResponseEvent({
        workflowId: this.jobId,
        content: message.content,
        model: this.model,
      })
      eventId = event.id
    }

    return eventId
  }

  async addJobId(jobId: string) {
    this.jobId = jobId

    // Process any queued messages
    for (const message of this.untrackedMessages) {
      await this.trackMessage(message)
    }
    this.untrackedMessages = [] // Clear the queue
  }

  async setSystemPrompt(
    prompt: string,
    role: "system" | "developer" = "system"
  ) {
    // Find and remove old prompt messages (system or developer) from Neo4j if we have a jobId
    if (this.jobId) {
      const oldPromptMessages = this.messages.filter(
        (message) => message.role === "system" || message.role === "developer"
      )
      for (const message of oldPromptMessages) {
        if (message.id) {
          await deleteEvent(message.id)
        }
      }
    }

    // Update messages array
    this.messages = this.messages.filter(
      (message) => message.role !== "system" && message.role !== "developer"
    )
    const systemMessage: EnhancedMessage = {
      role,
      content: prompt,
    }
    this.messages.unshift(systemMessage)

    // Track the message
    if (this.jobId) {
      await this.trackMessage(systemMessage)
    } else {
      this.untrackedMessages.push(systemMessage)
    }
  }

  // Alias for setSystemPrompt – provides the same behavior under a developer-centric name
  async setDeveloperPrompt(prompt: string) {
    // Simply delegate to setSystemPrompt so we keep a single implementation.
    return this.setSystemPrompt(prompt, "developer")
  }

  async addMessage(message: ChatCompletionMessageParam) {
    const enhancedMessage: EnhancedMessage = {
      ...message,
      timestamp: new Date(),
    }

    if (this.jobId) {
      enhancedMessage.id = await this.trackMessage(message)
    }

    this.messages.push(enhancedMessage)
  }

  // Best I could do to avoid type errors
  addTool<ToolSchema extends ZodType, ToolOutput>(
    tool: Tool<ToolSchema, ToolOutput>
  ) {
    this.tools.push(tool as unknown as Tool<ZodType, unknown>)
  }

  addApiKey(apiKey: string) {
    this.llm = new OpenAI({ apiKey })
  }

  addSpan({
    span,
    generationName,
  }: {
    span: LangfuseSpanClient
    generationName: string
  }) {
    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }
    this.llm = observeOpenAI(this.llm, { parent: span, generationName })
  }

  checkTools() {
    for (const tool of this.REQUIRED_TOOLS) {
      if (!this.tools.some((t) => t.function.name === tool)) {
        console.error(`Agent does not have the ${tool} tool`)
        return false
      }
    }
    return true
  }

  async runWithFunctions(): Promise<RunResponse> {
    const startTime = new Date()
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    // Ensure we have at least one user message after a prompt (system or developer) before generating response
    const hasPrompt = this.messages.some(
      (m) => m.role === "system" || m.role === "developer"
    )
    const hasUserMessage = this.messages.some((m) => m.role === "user")

    if (!hasPrompt || !hasUserMessage) {
      throw new Error(
        "Cannot generate response: Need both an initial prompt (system or developer) and at least one user message"
      )
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
      store: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools
    }
    const response = await this.llm.chat.completions.create(params)
    console.log(
      `[DEBUG] response: ${JSON.stringify(response.choices[0].message)}`
    )

    // Add and track the assistant's response
    await this.addMessage(response.choices[0].message)

    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        // Only handle function tool calls; ignore custom tool calls for now
        if (toolCall.type !== "function") {
          // Optional: track that we ignored a custom tool call
          if (this.jobId) {
            await createErrorEvent({
              workflowId: this.jobId,
              content: `Ignoring unsupported custom tool call (id=${toolCall.id})`,
            })
          }
          continue
        }

        const tool = this.tools.find(
          (t) => t.function.name === toolCall.function.name
        )
        if (tool) {
          // Track tool call event
          if (this.jobId) {
            await createToolCallEvent({
              workflowId: this.jobId,
              toolName: toolCall.function.name,
              toolCallId: toolCall.id,
              args: toolCall.function.arguments,
            })
          }

          const validationResult = tool.schema.safeParse(
            JSON.parse(toolCall.function.arguments)
          )
          if (!validationResult.success) {
            const errorContent = `Validation failed for tool ${toolCall.function.name}: ${validationResult.error.message}`
            console.error(errorContent)

            // Track error event
            if (this.jobId) {
              await createToolCallResultEvent({
                workflowId: this.jobId,
                toolCallId: toolCall.id,
                toolName: toolCall.function.name,
                content: errorContent,
              })
            }

            // Surface the validation error back to the LLM through a tool response
            await this.addMessage({
              role: "tool",
              content: errorContent,
              tool_call_id: toolCall.id,
            })
            continue
          }

          const toolResponse = await tool.handler(validationResult.data)

          let toolResponseString: string
          if (typeof toolResponse !== "string") {
            toolResponseString = JSON.stringify(toolResponse)
          } else {
            toolResponseString = toolResponse
          }

          if (this.jobId) {
            await createToolCallResultEvent({
              workflowId: this.jobId,
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              content: toolResponseString,
            })
          }

          await this.addMessage({
            role: "tool",
            content: toolResponseString,
            tool_call_id: toolCall.id,
          })
        } else {
          console.error(`Tool ${toolCall.function.name} not found`)
          // Track error event
          if (this.jobId) {
            await createErrorEvent({
              workflowId: this.jobId,
              content: `Tool ${toolCall.function.name} not found`,
            })
          }
        }
      }
      return await this.runWithFunctions()
    } else {
      return {
        jobId: this.jobId,
        startTime,
        endTime: new Date(),
        messages: this.messages,
      }
    }
  }

  async runOnce(): Promise<
    RunResponse & { response: ChatCompletionMessageParam }
  > {
    const startTime = new Date()

    // Ensure we have at least one user message after a prompt (system or developer) before generating response
    const hasPrompt = this.messages.some(
      (m) => m.role === "system" || m.role === "developer"
    )
    const hasUserMessage = this.messages.some((m) => m.role === "user")

    if (!hasPrompt || !hasUserMessage) {
      throw new Error(
        "Cannot generate response: Need both an initial prompt (system or developer) and at least one user message"
      )
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
      store: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools
    }

    const response = await this.llm.chat.completions.create(params)

    // Add and track the assistant's response
    await this.addMessage(response.choices[0].message)

    return {
      jobId: this.jobId,
      startTime,
      endTime: new Date(),
      messages: this.messages,
      response: response.choices[0].message,
    }
  }
}

// Custom type that extends OpenAI's FunctionCallOutput with toolName
type ExtendedFunctionCallOutput = ResponseInputItem.FunctionCallOutput & {
  toolName: string
}

// Type guard to check if a message has the toolName property
function hasToolName(
  message: ResponseInputItem
): message is ExtendedFunctionCallOutput {
  return message.type === "function_call_output" && "toolName" in message
}

// Helper function to convert ExtendedFunctionCallOutput to standard FunctionCallOutput
function toStandardFunctionCallOutput(
  extended: ExtendedFunctionCallOutput
): ResponseInputItem.FunctionCallOutput {
  // Extract out toolName so we don't send it back to OpenAI
  const { toolName: _, ...standard } = extended
  return standard
}

/**
 * Agent that uses OpenAI's Responses API instead of the Chat Completions API.
 * We keep message tracking on OpenAI's side using the `previous_response_id` – that
 * means we do **not** maintain a local message history array
 */
class ResponsesAPIAgent extends Agent {
  inputQueue: ResponseInput = []

  constructor(params: AgentConstructorParams) {
    super(params)
  }
  /**
   * Add developer prompt to the input queue
   */
  async setDeveloperPrompt(prompt: string) {
    await this.addInput({
      type: "message",
      role: "developer",
      content: prompt,
    })
  }

  /**
   * Adds message to the neo4j database
   */
  async trackInput(message: ResponseInputItem) {
    if (!this.jobId) return

    let event: AnyEvent

    switch (message.type) {
      case "message":
        let content: string

        if (typeof message.content !== "string") {
          content = JSON.stringify(message.content)
        } else {
          content = message.content
        }

        switch (message.role) {
          case "system":
          case "developer":
            event = await createSystemPromptEvent({
              workflowId: this.jobId,
              content,
            })
            return event.id

          case "user":
            event = await createUserResponseEvent({
              workflowId: this.jobId,
              content,
            })
            return event.id

          case "assistant":
            event = await createLLMResponseEvent({
              workflowId: this.jobId,
              id: "id" in message && message.id ? message.id : undefined,
              content,
              model: this.model,
            })
            return event.id
        }

      case "function_call":
        event = await createToolCallEvent({
          workflowId: this.jobId,
          toolName: message.name,
          toolCallId: message.call_id,
          args: message.arguments,
        })
        return event.id
      case "function_call_output":
        // Handle both standard OpenAI FunctionCallOutput and our extended version
        const toolName = hasToolName(message) ? message.toolName : "unknown"
        event = await createToolCallResultEvent({
          workflowId: this.jobId,
          toolName,
          toolCallId: message.call_id,
          content: message.output,
          id: "id" in message && message.id ? message.id : undefined,
        })
        return event.id

      case "reasoning":
        for (const summary of message.summary) {
          await createReasoningEvent({
            workflowId: this.jobId,
            summary: summary.text,
          })
        }
        return undefined

      case "web_search_call":
        event = await createToolCallEvent({
          workflowId: this.jobId,
          toolName: "web_search",
          toolCallId: message.id,
          args: JSON.stringify(message),
        })
        return event.id
      default:
        console.log("Message type not tracked yet", message)
        return undefined
    }
  }

  /**
   * Adds input to both the inputQueue and the database
   */
  async addInput(input: ResponseInputItem) {
    if (this.jobId) {
      await this.trackInput(input)
    }

    // If this is an ExtendedFunctionCallOutput, convert to standard for OpenAI
    if (hasToolName(input)) {
      this.inputQueue.push(toStandardFunctionCallOutput(input))
    } else {
      this.inputQueue.push(input)
    }
  }

  /**
   * Custom implementation of runWithFunctions that leverages OpenAI’s
   * Responses API instead of the Chat Completions API. We keep message
   * tracking on OpenAI’s side using the `previous_response_id` – that
   * means we do **not** maintain a local message history array beyond the
   * initial user / system prompts.
   */
  async runWithFunctions(): Promise<{
    jobId?: string
    startTime: Date
    endTime: Date
    messages: EnhancedMessage[]
  }> {
    // Ensure the agent has the required tools before starting
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const startTime = new Date()

    // Convert internal tools to OpenAI function-tool definition
    const functionTools = this.tools.map((t) => convertToolToFunctionTool(t))

    let previousResponseId: string | undefined

    while (true) {
      const params: ResponseCreateParamsNonStreaming = {
        model: this.model,
        store: true,
        reasoning: { summary: "auto" },
        tools: functionTools,
        input: this.inputQueue,
      }

      // Clear the input queue after using it
      this.inputQueue = []

      if (previousResponseId) {
        params.previous_response_id = previousResponseId
      }

      // Make the API call
      const response = await this.llm.responses.create(params)

      previousResponseId = response.id

      let hasFunctionCalls = false

      for (const item of response.output) {
        await this.trackInput(item)
        switch (item.type) {
          case "function_call":
            let toolResponse: ExtendedFunctionCallOutput
            hasFunctionCalls = true

            // Find the tool that the agent called
            const tool = this.tools.find((t) => t.function.name === item.name)

            if (!tool) {
              console.error(`Tool ${item.name} not found`) // Log for debugging
              toolResponse = {
                type: "function_call_output",
                call_id: item.call_id,
                output: `Tool ${item.name} not found`,
                toolName: item.name,
              }
              await this.addInput(toolResponse)
              continue
            }

            // Validate arguments against the tool schema
            const parsedArgs = JSON.parse(item.arguments)
            const validation = tool.schema.safeParse(parsedArgs)
            if (!validation.success) {
              console.error(
                `Validation failed for tool ${item.name}: ${validation.error.message}`
              )
              toolResponse = {
                type: "function_call_output",
                call_id: item.call_id,
                output: `Validation failed for tool ${item.name}: ${validation.error.message}`,
                toolName: tool.function.name,
              }
              await this.addInput(toolResponse)
              continue
            }

            const toolResult = await tool.handler(validation.data)
            const toolResultString =
              typeof toolResult === "string"
                ? toolResult
                : JSON.stringify(toolResult)

            toolResponse = {
              type: "function_call_output",
              call_id: item.call_id,
              output: toolResultString,
              toolName: tool.function.name,
            }
            await this.addInput(toolResponse)
            break
          case "code_interpreter_call":
          case "computer_call":
          case "file_search_call":
          case "image_generation_call":
          case "local_shell_call":
          case "mcp_approval_request":
          case "mcp_call":
          case "mcp_list_tools":
          case "message":
          case "reasoning":
          case "web_search_call":
            break
        }
      }

      if (!hasFunctionCalls) {
        // We reached a final assistant response – exit loop
        break
      }
    }

    return {
      jobId: this.jobId,
      startTime,
      endTime: new Date(),
      messages: [] as EnhancedMessage[],
    }
  }
}

// TODO: This belongs in @shared folder
// And also we'll have to make a specific octokit REST/GraphQL implementation
// of this functionality, basically similar to
// listBranchesSortedByCommitDate
// but separate the concerns and save it in @shared folder

/**
 * Adapter implementing the shared GitHubRefsPort using our app's GitHub client utilities.
 */
class GitHubRefsAdapter implements GitHubRefsPort {
  async listBranches({
    owner,
    repo,
  }: {
    owner: string
    repo: string
  }): Promise<string[]> {
    try {
      const branches = await listBranchesSortedByCommitDate({
        owner,
        repo,
        fullName: `${owner}/${repo}`,
      })
      return branches.map((b) => b.name)
    } catch (e) {
      console.warn(`[WARNING] Failed to list branches for ${owner}/${repo}:`, e)
      return []
    }
  }
}

const DEVELOPER_PROMPT = `
You are a senior software engineer tasked with fully resolving GitHub issues.
First, analyze the issue thoroughly and brainstorm a few possible solutions. After reflecting, choose the best approach.
Then implement the necessary code changes using your available tools.
Refer to codebase configuration files to best understand coding styles, conventions, code structure and organization.
Prepare code changes and a PR that you think has the highest chance of being approved. 
Also generally it'll mean the code changes should be small and focused, and exist squarely within the scope of the issue.

PRIMARY GOAL: Ensure any code you write passes all repository-defined linting/code-quality checks before opening the PR.
- Detect the appropriate linting commands from the repository context (language and tooling agnostic).
- Investigate configuration files and workflows to determine what to run, for example:
  - JavaScript/TypeScript: package.json scripts (e.g. "lint", "check", "lint:eslint", "lint:tsc", "prettier"), .eslintrc*, .prettierrc*, tsconfig*.json
  - Python: pyproject.toml (ruff/black/isort/mypy), requirements*.txt, setup.cfg, tox.ini
  - Go: golangci-lint config, go.mod, go vet, go fmt -l, staticcheck
  - Rust: Cargo.toml (cargo fmt -- --check, cargo clippy -D warnings)
  - Java/Kotlin: Gradle/Maven tasks like spotlessCheck/checkstyle (avoid running tests/builds if not strictly lint)
  - Other languages: prefer repo-provided Makefile targets or scripts named lint/check/format:check
- Choose the correct package manager/runner based on lockfiles:
  - pnpm-lock.yaml -> pnpm; yarn.lock -> yarn; package-lock.json -> npm
- If the environment needs dependencies, run setup_repo first (e.g. pnpm i, yarn, npm i, pip install -r requirements.txt, poetry install).
- Run read-only checks via file_check (single-line commands, no --fix/--write). Prefer project scripts (e.g. "pnpm run lint" or "pnpm run check:all").
- If linting fails, update your code and run checks again until they pass.
- Only when lint checks pass should you proceed to sync the branch and create the PR.

IMPORTANT: Before you finish, YOU MUST create a pull request by calling the create_pull_request tool. Do NOT end the conversation until this tool has been successfully invoked.
`

// Extra constructor params required for tool construction
interface PlanAndCodeAgentParams extends AgentConstructorParams {
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

class PlanAndCodeAgent extends ResponsesAPIAgent {
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

    // Initialise base Agent (model defaults to "gpt-5" if not overridden)
    super({ model: "gpt-5", ...base })

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

/******************************
 *
 *
 * MAIN FUNCTION
 * KEEP THIS MAIN FUNCTION HERE IN THIS FILE
 *
 *
 *
 * ******************************/
interface Params {
  issue: GitHubIssue
  repository: GitHubRepository
  /** User GitHub login, in order to lookup their OpenAI API key */
  login: string
  jobId?: string
  /** Optional branch to run the workflow on. If omitted, a new feature branch is generated. */
  branch?: string
}

interface AutoResolveIssuePorts {
  settings: SettingsReaderPort
  eventBus?: EventBusPort
}
const autoResolveIssue = async (
  params: Params,
  ports: AutoResolveIssuePorts
) => {
  const { issue, repository, login, jobId, branch } = params
  const { settings, eventBus } = ports

  // =================================================
  // Step 0: Setup workflow publisher
  // =================================================
  const workflowId = jobId ?? uuidv4()
  const pub = createWorkflowEventPublisher(eventBus, workflowId)

  // =================================================
  // Step 1: Get API key
  // =================================================

  const apiKeyResult = await settings.getOpenAIKey(login)
  if (!apiKeyResult.ok || !apiKeyResult.value) {
    pub.workflow.error("No API key provided and no user settings found")
    throw new Error("No API key provided and no user settings found")
  }
  const apiKey = apiKeyResult.value

  // =================================================
  // Step 2: Initialize workflow
  // =================================================

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

    if (branch && branch.trim().length > 0) {
      workingBranch = branch.trim()
      await createStatusEvent({
        workflowId,
        content: `Using provided branch: ${workingBranch}`,
      })
    } else {
      try {
        // TODO: This is super messy.
        // This workflow is supposed to be a use case.
        // Here, we're calling another use case within the use case.
        // As well as importing adapters directly in the use case.
        // This should not happen.
        // Either this use case needs to be called outside this use case independently
        // Or we combine in internals of generateNonConflictingBranchName into this use case
        const llm = new OpenAIAdapter(apiKey)
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
