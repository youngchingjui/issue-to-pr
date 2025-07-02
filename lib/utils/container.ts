import os from "os"
import path from "path"
import { v4 as uuidv4 } from "uuid"

import {
  execInContainer,
  startDetachedContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { addWorktree, removeWorktree } from "@/lib/git"
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
  /** Docker image to use (default "ghcr.io/youngchingjui/agent-base") */
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
  image = "ghcr.io/youngchingjui/agent-base",
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
