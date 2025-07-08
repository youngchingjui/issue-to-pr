"use server"

import { exec } from "child_process"
import Docker from "dockerode"
import util from "util"

import {
  WriteFileInContainerParams,
  writeFileInContainerSchema,
} from "@/lib/types/docker"

const execPromise = util.promisify(exec)

interface StartDetachedContainerOptions {
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
 * `/dev/null` so it stays alive and returns the new container's ID.
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

/**
 * Executes a shell command in a running container using Dockerode.
 * @param name Container name or ID
 * @param command Shell command to run (sh -c)
 * @param cwd Optional working directory inside container
 * @returns { stdout, stderr, exitCode }
 */
export async function execInContainerWithDockerode({
  name,
  command,
  cwd,
}: {
  name: string
  command: string
  cwd?: string
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (!name || typeof name !== "string" || !name.trim()) {
    return {
      stdout: "",
      stderr: "Container name must not be empty.",
      exitCode: 1,
    }
  }
  let docker: Docker
  try {
    docker = new Docker({ socketPath: "/var/run/docker.sock" })
  } catch (e: unknown) {
    return {
      stdout: "",
      stderr: `Failed to initialize Dockerode: ${e}`,
      exitCode: 1,
    }
  }
  let container: Docker.Container
  try {
    container = docker.getContainer(name)
    // Check if the container exists & is running
    const data = await container.inspect()
    if (!data.State.Running) {
      return { stdout: "", stderr: "Container is not running.", exitCode: 1 }
    }
  } catch (e: unknown) {
    return {
      stdout: "",
      stderr: `Container not found or not running: ${e}`,
      exitCode: 1,
    }
  }
  try {
    // Use shell to match parity with the CLI version
    const exec = await container.exec({
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: cwd,
      User: "root:root",
    })
    const stream = await exec.start({})
    let stdout = ""
    let stderr = ""
    await new Promise<void>((resolve, reject) => {
      container.modem.demuxStream(
        stream,
        {
          write(chunk: Buffer | string) {
            stdout += chunk.toString()
          },
          end: () => {},
        },
        {
          write(chunk: Buffer | string) {
            stderr += chunk.toString()
          },
          end: () => {},
        }
      )
      stream.on("end", resolve)
      stream.on("error", reject)
    })
    // Get exit code
    const inspectRes = await exec.inspect()
    return {
      stdout,
      stderr,
      exitCode:
        typeof inspectRes.ExitCode === "number" ? inspectRes.ExitCode : 0,
    }
  } catch (e: unknown) {
    return {
      stdout: "",
      stderr: `Failed to exec in container: ${e}`,
      exitCode: 1,
    }
  }
}

/**
 * @deprecated Prefer execInContainerWithDockerode for robust inside-container execution.
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
  const execCmd = `docker exec ${workdirFlag} ${name} sh -c '${command.replace(/'/g, "'\\''")}'`
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

/**
 * Write file contents to a path inside a running container using Dockerode.
 *
 * @param name Container name or ID
 * @param workdir Base working directory inside the container
 * @param relPath Relative file path from workdir
 * @param contents File contents to write
 * @param makeDirs Whether to create parent directories if they don't exist
 * @returns { stdout, stderr, exitCode }
 */
export async function writeFileInContainer(
  params: WriteFileInContainerParams
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Validate input parameters with Zod
  const validationResult = writeFileInContainerSchema.safeParse(params)

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ")

    return {
      stdout: "",
      stderr: `Input validation failed: ${errorMessages}`,
      exitCode: 1,
    }
  }

  const { name, workdir, relPath, contents, makeDirs } = validationResult.data

  // Construct the full path (Zod validation ensures relPath is safe)
  const fullPath = `${workdir.replace(/\/$/, "")}/${relPath}`

  // Build the command
  let command = ""

  if (makeDirs) {
    // Create parent directories if needed
    command += `mkdir -p "$(dirname "${fullPath}")" && `
  }

  // Use heredoc to safely write contents (avoids escaping issues)
  command += `cat > "${fullPath}" << 'WRITE_FILE_EOF'\n${contents}\nWRITE_FILE_EOF`

  // Execute the command
  try {
    const result = await execInContainerWithDockerode({
      name,
      command,
      cwd: workdir,
    })

    // If successful, add the file path to stdout for confirmation
    if (result.exitCode === 0) {
      result.stdout = `File successfully written to: ${fullPath}\n${result.stdout}`
    }

    return result
  } catch (e: unknown) {
    return {
      stdout: "",
      stderr: `Failed to write file: ${e}`,
      exitCode: 1,
    }
  }
}
