import { exec as execCallback } from "node:child_process"

import os from "os"
import path from "path"
import { promisify } from "util"
import { v4 as uuidv4 } from "uuid"

import {
  execInContainer,
  startDetachedContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { addWorktree, removeWorktree } from "@/lib/git"
import type { RepoEnvironment } from "@/lib/types"
import { setupLocalRepository } from "@/lib/utils/utils-server"

export interface ContainerizedWorktreeResult {
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

export interface ContainerizedWorktreeOptions {
  /** e.g. "owner/repo" */
  repoFullName: string
  /** branch to check out for the worktree (default "main") */
  branch?: string
  /** optional externally-supplied workflow run id */
  workflowId?: string
  /** Docker image to use (default "issue-to-pr/agent-base") */
  image?: string
  /** Mount path inside container (default "/workspace") */
  mountPath?: string
}

/**
 * Creates a directory tree listing from within a container, replicating the logic
 * from lib/fs.ts createDirectoryTree but executing in the containerized environment.
 *
 * Excludes:
 * - node_modules directories
 * - Hidden files and folders (starting with .)
 * - Directories themselves (only files are included)
 */
export async function createContainerizedDirectoryTree(
  exec: (
    command: string
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>,
  containerDir: string = "/workspace"
): Promise<string[]> {
  // TODO: Use `tree` instead
  // TODO: Don't exclude node_modules, use .gitignore instead
  // TODO: Don't skip hidden files/folders

  // Use find command to replicate the createDirectoryTree logic:
  // - Find all files (not directories)
  // - Exclude node_modules paths
  // - Exclude hidden files/folders
  // - Get relative paths from the container directory
  const findCommand = `cd ${containerDir} && find . -type f ! -path "*/node_modules/*" ! -path "*/.*" | sed 's|^\\./||' | sort`

  try {
    const { stdout, stderr, exitCode } = await exec(findCommand)

    if (exitCode !== 0) {
      console.warn(`Directory tree generation failed: ${stderr}`)
      return []
    }

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch (error) {
    console.warn(`Failed to create directory tree: ${error}`)
    return []
  }
}

/**
 * Sets up a containerized worktree environment for agent workflows.
 *
 * This function:
 * 1. Clones/updates the repository locally
 * 2. Creates a git worktree for the specified branch
 * 3. Starts a Docker container with the worktree mounted
 * 4. Returns helpers for executing commands and cleanup
 */
export async function createContainerizedWorktree({
  repoFullName,
  branch = "main",
  workflowId = uuidv4(),
  image = "issue-to-pr/agent-base",
  mountPath = "/workspace",
}: ContainerizedWorktreeOptions): Promise<ContainerizedWorktreeResult> {
  // 1. Ensure we have a clean local clone
  const cloneDir = await setupLocalRepository({
    repoFullName,
    workingBranch: branch,
  })

  // 2. Compute sibling worktree dir (avoid nesting worktrees)
  const worktreeBase = path.join(os.tmpdir(), "git-worktrees", repoFullName)
  const worktreeDir = path.join(worktreeBase, workflowId)

  // 3. Add the worktree for the chosen branch
  await addWorktree(cloneDir, worktreeDir, branch)

  const containerName = `agent-${workflowId}`.replace(/[^a-zA-Z0-9_.-]/g, "-")

  // 4. Start detached container mounting the worktree
  await startDetachedContainer({
    image,
    hostDir: worktreeDir,
    name: containerName,
  })

  // Helper functions
  const exec = async (command: string) => {
    return await execInContainer({
      name: containerName,
      command,
    })
  }

  const cleanup = async () => {
    // Stop and remove container
    await stopAndRemoveContainer(containerName)

    // Remove worktree
    try {
      await removeWorktree(cloneDir, worktreeDir, true)
    } catch (e) {
      console.warn(`[WARNING] Failed to remove worktree ${worktreeDir}:`, e)
    }
  }

  return {
    worktreeDir,
    containerName,
    exec,
    cleanup,
    workflowId,
  }
}

/**
 * Helper to normalize legacy baseDir string to RepoEnvironment
 */
export function asEnv(arg: string | RepoEnvironment): RepoEnvironment {
  return typeof arg === "string"
    ? { kind: "host", root: arg } // auto-wrap legacy baseDir
    : arg
}

const execPromise = promisify(execCallback)

/**
 * Normalize a string or array of shell commands into an array of trimmed commands.
 */
function normalizeCommands(cmd?: string[] | string): string[] {
  if (!cmd) return []
  if (typeof cmd === "string") {
    // Support splitting commands provided via textarea (new-lines or semicolons)
    if (cmd.includes("\n"))
      return cmd
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
    if (cmd.includes(";"))
      return cmd
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
    return [cmd.trim()]
  }
  return cmd.map((x) => x.trim()).filter(Boolean)
}

/**
 * Sets up the environment after repository checkout by running the provided shell commands.
 *
 * It purposely avoids any side-effects such as creating Neo4j events. Instead, it:
 *   • returns a confirmation message when the setup completes successfully.
 *   • throws an Error when any command fails so the caller can handle/report it.
 *
 * @param baseDir        Absolute path to the project directory where commands should be executed.
 * @param setupCommands  Shell command(s) to run. Can be a single string or an array.
 * @returns              A human-readable confirmation message on success.
 * @throws               If any command exits with a non-zero status or the spawn fails.
 */
export async function setupEnv(
  baseDir: string,
  setupCommands?: string[] | string
): Promise<string> {
  const commands = normalizeCommands(setupCommands)

  // Nothing to execute – simply return.
  if (!commands.length) {
    return "No setup commands provided – skipping environment setup."
  }

  const outputLogs: string[] = []

  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: baseDir })

      // Capture outputs for the final result so the caller can surface them if desired.
      outputLogs.push(
        [`$ ${cmd}`, stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n")
      )
    } catch (err: unknown) {
      // If exec fails we still want to surface stdout/stderr that may help debugging.
      const errorObj = err as {
        stdout?: string | Buffer
        stderr?: string | Buffer
      }
      const stdout = errorObj.stdout?.toString() ?? ""
      const stderr = errorObj.stderr?.toString() ?? ""
      const baseMessage = `Setup command failed (${cmd}): ${String(err)}`

      throw new Error(
        [baseMessage, stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
      )
    }
  }

  // If there were no logs (e.g., commands produced no output), still return a confirmation message.
  return outputLogs.length
    ? outputLogs.join("\n")
    : "Environment setup completed successfully. (no output)"
}
