import { exec } from "child_process"
import util from "util"
import path from "path"
import { relativePathSchema } from "@/lib/types/utils/path"

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

/**
 * Starts a detached Docker container (`docker run -d`) that simply tails
 * `/dev/null` so it stays alive and returns the new container'\''s ID.
 *
 * The helper constructs the appropriate command-line flags for container
 * name, non-root user, bind-mounts, environment variables, and working
 * directory based on the provided `StartDetachedContainerOptions`.
 *
 * About the `user` option (`UID:GID`):
 *   The default value **"1000:1000"** represents the first non-root user and
 *   group created on most Linux systems. Running the container as this
 *   UID/GID means the processes inside the container do **not** run as root,
 *   yet any files they create inside bind-mounted volumes will be owned by the
 *   same user on the host. This avoids permission problems and lets you write
 *   to the mounted directory from both the host and the container without
 *   additional `chown` steps.
 *
 * @param {StartDetachedContainerOptions} options                       Options used to start the container.
 * @param {string} options.image                                        Docker image to start.
 * @param {string} options.name                                         Name to assign to the container (must be unique).
 * @param {string} [options.user="1000:1000"]                           UID:GID string to run the container as; defaults to non-root `1000:1000`.
 * @param {Array<{hostPath: string, containerPath: string, readOnly?: boolean}>} [options.mounts=[]]
 *                                                                       Host paths to bind-mount into the container.
 * @param {string} [options.workdir]                                    Working directory inside the container (defaults to first mount or "/").
 * @param {Record<string,string>} [options.env={}]                      Environment variables to set inside the container.
 *
 * @returns {Promise<string>} The ID of the started container (stdout from `docker run`).
 */
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
    ([key, value]) => `-e \"${key}=${value.replace(/"/g, '\''\\\"'\'')}\"`
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

/**
 * Execute a shell command inside a running container.
 *
 * The provided `command` string will be automatically escaped so that it is
 * safe to pass to `sh -c` inside the container. The resulting Docker command
 * looks like:
 *
 * ```bash
 * docker exec [--workdir <cwd>] <name> sh -c '\''<command>'\''
 * ```
 *
 * Because this helper already performs the necessary escaping, callers SHOULD
 * pass the raw command and **must not** pre-sanitize or quote it themselves.
 * Otherwise the command may be double-escaped and fail to run as expected.
 */
export async function execInContainer({
  name,
  command,
  cwd,
}: {
  name: string
  command: string
  cwd?: string
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const workdirFlag = cwd ? `--workdir \"${cwd}\"` : ""
  const execCmd = `docker exec ${workdirFlag} ${name} sh -c '\''${command.replace(/'\''/g, "'\''\\'\'''\''")}'\''`
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
      `docker inspect -f '\''{{.State.Running}}'\'' ${name}`
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
    const { stdout } = await execPromise("docker ps --format '\''{{json .}}'\''")
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

/**
 * Write a file in a running Docker container, using /bin/sh and tee via execInContainer. Handles multi-line and arbitrary file contents by streaming stdin via tee. 
 * 
 * Throws if path is unsafe or writing fails. 
 */
export async function writeFileInContainer({
  name,
  workdir,
  relativePath,
  contents,
}: {
  name: string
  workdir: string
  relativePath: string
  contents: string
}): Promise<void | Error> {
  // Validate path: must be relative, no .., no abs, etc
  const relCheck = relativePathSchema.safeParse(relativePath)
  if (!relCheck.success) {
    throw new Error(`Invalid relativePath: ${relCheck.error.message}`)
  }
  if (!workdir || typeof workdir !== "string" || workdir[0] !== "/") {
    throw new Error("Workdir must be an absolute directory in the container.")
  }
  // Compose target file path
  const targetPath = path.posix.join(workdir, relativePath)
  // Use tee for multiline/large content
  // Construct: sh -c '\''cat > /path/to/file'\''
  // We stream the contents to the container as stdin
  // Note: execInContainer uses sh -c '\''...'\'' so we must ensure newlines and content are passed as stdin, not via shell args.
  // Because child_process.promisify doesn'\''t support stdin piping,
  // we need to manually construct a "docker exec" command and pipe to it.
  //
  // Instead of using execInContainer, use spawn + pipe for this purpose (uses shell redirection safely).

  const { spawn } = await import("child_process")
  const dockerArgs = [
    "exec",
    "-i",
    "--workdir",
    workdir,
    name,
    "sh",
    "-c",
    `cat > '\''${targetPath.replace(/'\''/g, "'\''\\'\'''\''")}'\''`,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn("docker", dockerArgs, { stdio: ["pipe", "pipe", "pipe"] })
    proc.stdin.write(contents)
    proc.stdin.end()
    let stderr = ""
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`docker exec failed: ${stderr.trim()}`))
      }
    })
    proc.on("error", (err) => {
      reject(err)
    })
  })
}
