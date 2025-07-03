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

export async function startContainer({
  image,
  name,
  hostDir,
  user = "1000:1000",
}: {
  image: string
  name: string
  hostDir?: string
  user?: string
}): Promise<string> {
  const cmdParts = ["docker run -d", `--name ${name}`, `-u ${user}`]

  if (hostDir) {
    // Mount the host directory to /workspace inside the container and set it as the working directory
    cmdParts.push(`-v \"${hostDir}:/workspace\"`, "-w /workspace")
  }

  cmdParts.push(image, "tail -f /dev/null")

  const { stdout } = await execPromise(cmdParts.join(" "))
  return stdout.trim()
}

export async function execInContainer({
  name,
  command,
}: {
  name: string
  command: string
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const execCmd = `docker exec ${name} sh -c '${command.replace(/'/g, "'\\''")}'`
  try {
    const { stdout, stderr } = await execPromise(execCmd)
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
