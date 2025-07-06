import { exec } from "child_process"
import util from "util"

const execPromise = util.promisify(exec)

// Default image name and literal type
const DEFAULT_AGENT_BASE_IMAGE = "ghcr.io/youngchingjui/agent-base" as const

// Image name that can be overridden via environment variable
export const AGENT_BASE_IMAGE: string =
  process.env.AGENT_BASE_IMAGE ?? DEFAULT_AGENT_BASE_IMAGE

// Literal type representing the default image (useful for narrowing)
export type AgentBaseImage = typeof DEFAULT_AGENT_BASE_IMAGE

export interface StartDetachedContainerOptions {
  image: string
  name: string
  /** UID:GID string; default keeps container non-root */
  user?: string
  /** Bind-mounts */
  mounts?: Array<{
    hostPath: string
    containerPath: string
    readOnly?: boolean
  }>
  /** Working directory inside the container */
  workdir?: string
  /** Environment variables to set inside the container */
  env?: Record<string, string>
}

export async function startContainer({
  image,
  name,
  user = "1000:1000",
  mounts = [],
  workdir,
  env = {},
}: StartDetachedContainerOptions): Promise<string> {
  // 1. Build volume flags: -v "host:container[:ro]"
  const volumeFlags = mounts.map(({ hostPath, containerPath, readOnly }) => {
    const ro = readOnly ? ":ro" : ""
    return `-v \"${hostPath}:${containerPath}${ro}\"`
  })

  // 2. Build environment variable flags: -e "KEY=value"
  const envFlags = Object.entries(env).map(
    ([key, value]) => `-e \"${key}=${value.replace(/"/g, '\\\"')}\"`
  )

  // 3. Determine working directory
  const wdPath = workdir ?? (mounts.length ? mounts[0].containerPath : "/")
  const wdFlag = wdPath ? `-w \"${wdPath}\"` : undefined

  // 4. Assemble command parts and filter out undefined entries
  const cmd = [
    "docker run -d",
    `--name ${name}`,
    `-u ${user}`,
    ...envFlags,
    ...volumeFlags,
    wdFlag,
    image,
    "tail -f /dev/null",
  ]
    .filter(Boolean)
    .join(" ")

  const { stdout } = await execPromise(cmd)
  return stdout.trim()
}

export async function execInContainer({
  name,
  command,
  cwd,
}: {
  name: string
  command: string
  cwd?: string
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const execCmd = `docker exec ${name} sh -c '${command.replace(/'/g, "'\\''")}'`
  try {
    const { stdout, stderr } = await execPromise(execCmd, { cwd })
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    const err = error as {
      stdout?: string
      stderr?: string
      code?: number
      message?: string
    }
    // child_process.exec provides stdout/stderr even on errors
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    }
  }
}

export async function stopAndRemoveContainer(name: string): Promise<void> {
  try {
    await execPromise(`docker rm -f ${name}`)
  } catch (e) {
    console.warn(`[WARNING] Failed to stop/remove container ${name}:`, e)
  }
}

export async function isContainerRunning(name: string): Promise<boolean> {
  try {
    const { stdout } = await execPromise(
      `docker inspect -f '{{.State.Running}}' ${name}`
    )
    return stdout.trim() === "true"
  } catch {
    return false
  }
}

export interface RunningContainer {
  id: string
  name: string
  image: string
  status: string
}

/**
 * List currently running Docker containers.
 */
export async function listRunningContainers(): Promise<RunningContainer[]> {
  try {
    const { stdout } = await execPromise("docker ps --format '{{json .}}'")
    const lines = stdout.trim().split("\n").filter(Boolean)
    return lines.map((line) => {
      const data = JSON.parse(line) as Record<string, string>
      return {
        id: data.ID,
        name: data.Names,
        image: data.Image,
        status: data.Status,
      }
    })
  } catch (error) {
    console.error("[ERROR] Failed to list running containers:", error)
    return []
  }
}
