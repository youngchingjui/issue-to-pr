import { exec as hostExec } from "child_process"
os from "os"
import path from "path"
import util from "util"
import { v4 as uuidv4 } from "uuid"

import { AGENT_BASE_IMAGE } from "@/lib/docker"
import {
  execInContainer,
  startContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { addWorktree, removeWorktree } from "@/lib/git"
import { getAuthToken } from "@/lib/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"
import { shellEscape } from "@/lib/utils/cli"

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
export const DEFAULT_GIT_USER_NAME = "Issue To PR agent"
export const DEFAULT_GIT_USER_EMAIL = "agent@issuetopr.dev"

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
    const { stdout, stderr, exitCode } = await execInContainer({
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
  image = AGENT_BASE_IMAGE,
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

  // 4. Start detached container mounting both the *clone* (read-only) and the *worktree* (rw)
  await startContainer({
    image,
    name: containerName,
    mounts: [
      { hostPath: cloneDir, containerPath: cloneDir, readOnly: true },
      { hostPath: worktreeDir, containerPath: worktreeDir },
    ],
    workdir: worktreeDir,
  })

  // Helper functions
  const exec = async (command: string) => {
    // For safety, wrap the command if coming from user input or variable if used here
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
 * Sets up a Docker container with the repository cloned inside the container itself (no host worktree).
 * This mirrors the manual workflow described by the user: a fresh container, Git credentials
 * configured via the passed GitHub token, followed by cloning the repository inside /workspace.
 *
 * Compared to createContainerizedWorktree, this approach does NOT rely on git worktrees mounted
 * from the host. All git operations happen entirely inside the container.
 */
export async function createContainerizedWorkspace({
  repoFullName,
  branch = "main",
  workflowId = uuidv4(),
  image = AGENT_BASE_IMAGE,
  mountPath = "/workspace",
  hostRepoPath,
}: ContainerizedWorktreeOptions): Promise<ContainerizedWorktreeResult> {
  // 1. Obtain a GitHub token (from user session if possible, otherwise app installation)
  const authTokenResult = await getAuthToken()
  const token = authTokenResult?.token

  if (!token) {
    throw new Error(
      "Unable to obtain GitHub token for containerized workspace setup"
    )
  }

  // 2. Start a detached container with GITHUB_TOKEN env set
  const containerName = `agent-${workflowId}`.replace(/[^a-zA-Z0-9_.-]/g, "-")

  await startContainer({
    image,
    name: containerName,
    user: "root",
    env: {
      GITHUB_TOKEN: token,
    },
    workdir: mountPath,
  })

  // 3. Helper exec wrapper
  const exec = async (command: string) =>
    await execInContainer({
      name: containerName,
      command,
      cwd: mountPath,
    })

  // 4. Configure Git inside the container
  await exec(`git config --global user.name ${shellEscape(DEFAULT_GIT_USER_NAME)}`)
  await exec(`git config --global user.email ${shellEscape(DEFAULT_GIT_USER_EMAIL)}`)
  await exec("git config --global credential.helper store")
  await exec(
    // The token does not need shellEscape as it is embedded by printf escape rules
    '\''sh -c "printf \"https://%s:x-oauth-basic@github.com\\n\" \"$GITHUB_TOKEN\" > ~/.git-credentials"'\''
  )

  // If a host repository directory is provided, copy it into the container to
  // avoid another network clone. Fallback to git clone when not provided.
  if (hostRepoPath) {
    // Ensure destination directory exists inside container
    await exec(`mkdir -p ${shellEscape(mountPath)}`)

    // Copy contents (including hidden files) from hostRepoPath -> container
    // Use docker cp with trailing /. to copy directory contents, not parent dir
    await execHost(
      `docker cp "${hostRepoPath}/." ${containerName}:${mountPath}`
    )

    // Fix ownership of the repository inside the container to avoid
    // Git "dubious ownership" warnings caused by mismatched host UIDs.
    await exec(`chown -R root:root ${shellEscape(mountPath)}`)

    // Reset to desired branch in case copied repo isn'\''t on it
    await exec(`git fetch origin && git checkout ${shellEscape(branch)}`)
  } else {
    // 5. Clone the repository and checkout the requested branch
    await exec(`git clone https://github.com/${repoFullName} ${shellEscape(mountPath)}`)
    await exec(`git checkout ${shellEscape(branch)}`)
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
