/*
 * Run shell commands in a per-repo Docker container. If the container is not running, builds/starts it.
 * Ensures all shell commands (tools, git, setup, lint, tsc, etc.) are run inside the container,
 * never on the host.
 */

import { exec as execCb } from "child_process"
import path from "path"
import util from "util"

const execPromise = util.promisify(execCb)

/**
 * Converts a repo name (owner/repo) to a valid docker container name
 * (useful to standardize everywhere, and avoid issues with illegal chars).
 */
export function repoFullNameToContainerName(repoFullName: string) {
  // Docker container names must only have [a-zA-Z0-9][a-zA-Z0-9_.-]
  // We'll use owner__repo, lower-cased
  return "repo-" + repoFullName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
}

/**
 * Asserts that the container for this repo is running. If not, starts or creates it.
 * (This just starts it for now; in a real deployment, image build, volume mount, etc., must occur elsewhere)
 */
async function ensureContainerRunning(
  repoFullName: string,
  volumePath: string
) {
  const containerName = repoFullNameToContainerName(repoFullName)
  // Check if running
  try {
    const { stdout } = await execPromise(
      `docker ps --filter "name=^/${containerName}$" --format "{{.Names}}"`
    )
    if (stdout.trim() === containerName) return
  } catch (e) {}
  // Try to start if exists
  try {
    await execPromise(`docker start ${containerName}`)
    return
  } catch (e) {}
  // If not found, create and run (using a basic node image; replace as needed)
  // The container mounts the repo's volumePath to /workspace inside container
  await execPromise(
    `docker run -d --rm --name ${containerName} -v "${volumePath}:/workspace" -w /workspace node:20 tail -f /dev/null`
  )
}

/**
 * Runs a shell command inside the repo's Docker container.
 * @param repoFullName e.g. "youngchingjui/issue-to-pr"
 * @param command      The shell command to run (single-line string)
 * @param options      { cwd? } -- cwd is relative to the workspace in container
 * @returns            { stdout, stderr, code }
 */
export async function runInRepoContainer(
  repoFullName: string,
  command: string,
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string; code: number }> {
  // Determine repo working dir (outside the container)
  // This should be the same temp dir created per repo
  const getLocalRepoDir = (await import("./fs")).getLocalRepoDir as (
    repoFullName: string
  ) => Promise<string>
  const volumePath = await getLocalRepoDir(repoFullName)

  // Ensure the container is running and set up
  await ensureContainerRunning(repoFullName, volumePath)

  const containerName = repoFullNameToContainerName(repoFullName)
  // If cwd provided, respect it (otherwise /workspace)
  const execCwd = options?.cwd
    ? path.posix.join("/workspace", options.cwd)
    : "/workspace"

  // Compose docker exec command, always with /bin/bash -c "cd CWD && your cmd"
  const dockerCmd = `docker exec -w "${execCwd}" ${containerName} bash -c ${JSON.stringify(command)}`
  try {
    const { stdout, stderr } = await execPromise(dockerCmd)
    return { stdout, stderr, code: 0 }
  } catch (err: unknown) {
    const error = err as {
      stdout?: string
      stderr?: string
      code?: number
      message?: string
    }
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Command failed in container.",
      code: typeof error.code === "number" ? error.code : 1,
    }
  }
}
