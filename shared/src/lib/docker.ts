"use server"

import { exec } from "child_process"
import Docker from "dockerode"
import util from "util"

import {
  RunningContainer,
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
  /** Optional labels to attach to the container */
  labels?: Record<string, string>
  /** Optional network to connect with optional aliases */
  network?: { name: string; aliases?: string[] }
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
 * @param {Record<string,string>} [options.labels]                      Labels to set on the container (e.g. preview=true).
 * @param {{name: string, aliases?: string[]}} [options.network]        Network to join and optional aliases to register.
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
  labels,
  network,
}: StartDetachedContainerOptions): Promise<string> {
  // Determine working directory (fallback to first mount or "/")
  const workingDir = workdir ?? (mounts.length ? mounts[0].containerPath : "/")

  // Translate mounts to HostConfig.Binds strings: "host:container[:ro]"
  const binds = mounts.map(
    ({ hostPath, containerPath, readOnly }) =>
      `${hostPath}:${containerPath}${readOnly ? ":ro" : ""}`
  )

  // Translate env object to array of "KEY=VALUE" strings
  const envList = Object.entries(env).map(([k, v]) => `${k}=${v}`)

  // Prepare networking configuration if a network is requested
  const endpointsConfig = network?.name
    ? {
        [network.name]: {
          Aliases: Array.isArray(network.aliases)
            ? network.aliases.filter((a) => a && a.trim().length > 0)
            : [],
        },
      }
    : undefined

  // Initialize docker client
  const docker = new Docker({ socketPath: "/var/run/docker.sock" })

  // Create container definition
  const createOptions: Docker.ContainerCreateOptions = {
    name,
    Image: image,
    User: user,
    WorkingDir: workingDir,
    Labels: labels,
    Env: envList,
    Cmd: ["tail", "-f", "/dev/null"],
    HostConfig: {
      Binds: binds,
      // Mirror `--network` behavior
      ...(network?.name ? { NetworkMode: network.name } : {}),
    },
    ...(endpointsConfig
      ? { NetworkingConfig: { EndpointsConfig: endpointsConfig } }
      : {}),
  }

  // Create and start the container
  const container = await docker.createContainer(createOptions)
  await container.start()

  // Return the container id (similar to `docker run -d` output)
  return container.id
}

/**
 * Executes a command in a running container using Dockerode.
 * 
 * SECURITY NOTICE:
 * - String commands use shell interpolation (sh -c) and are vulnerable to injection
 * - Array commands are executed directly and are safe from injection attacks
 * - Always prefer array form when user input is involved
 * 
 * @example
 * // UNSAFE - vulnerable to injection if userInput contains malicious characters
 * await execInContainerWithDockerode({ 
 *   name: "container", 
 *   command: `git checkout ${userInput}` 
 * })
 * 
 * // SAFE - no shell interpolation, injection-proof
 * await execInContainerWithDockerode({ 
 *   name: "container", 
 *   command: ["git", "checkout", userInput] 
 * })
 * 
 * @param name Container name or ID
 * @param command Shell command to run (string uses sh -c, array avoids shell)
 * @param cwd Optional working directory inside container
 * @returns { stdout, stderr, exitCode }
 */
export async function execInContainerWithDockerode({
  name,
  command,
  cwd,
}: {
  name: string
  command: string | string[]
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
    // If command is an array, pass it directly (safer, no shell interpolation)
    // If command is a string, use shell to match parity with the CLI version
    const cmd = Array.isArray(command) ? command : ["sh", "-c", command]
    
    const exec = await container.exec({
      Cmd: cmd,
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

export async function stopAndRemoveContainer(name: string): Promise<void> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" })
    const container = docker.getContainer(name)

    // Attempt to stop if running; then force remove
    try {
      const info = await container.inspect()
      if (info.State?.Running) {
        await container.stop()
        console.log(`Stopped container: ${name}`)
      }
    } catch (error: unknown) {
      console.warn(`Warning inspecting/stopping container ${name}:`, error)
    }

    await container.remove({ force: true })
    console.log(`Removed container: ${name}`)
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
 * List container names matching a set of Docker label filters. Includes stopped containers.
 * SECURITY: Uses dockerode API instead of shell commands to prevent injection attacks.
 */
export async function listContainersByLabels(
  labels: Record<string, string>
): Promise<string[]> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" })

    const labelFilters = Object.entries(labels)
      .filter(([, v]) => v != null && String(v).trim().length > 0)
      .map(([k, v]) => `${k}=${v}`)

    const containers = await docker.listContainers({
      all: true,
      filters: { label: labelFilters },
    })

    const names = containers
      .flatMap((c) => c.Names ?? [])
      .map((n) => n.replace(/^\//, ""))
      .filter(Boolean)

    return [...new Set(names)]
  } catch (error) {
    console.error("[ERROR] Failed to list containers by labels:", error)
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

/**
 * Retrieve a Docker container's status string via `docker inspect`.
 *
 * Possible statuses include: "created", "running", "paused", "restarting",
 * "removing", "exited", "dead". If the container cannot be found, the
 * function returns "not_found".
 */
export async function getContainerStatus(name: string): Promise<string> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" })
    const container = docker.getContainer(name)
    const data = await container.inspect()
    return data.State?.Status || "unknown"
  } catch {
    return "not_found"
  }
}

/**
 * Container git information result
 */
interface ContainerGitInfo {
  branch: string
  status: string
  diffStat: string
  diff: string
}

/**
 * Extract git information from a running container. Executes a series of git
 * commands inside the container and returns structured information useful for
 * surfacing in the UI.
 *
 * @param containerName - Name of the running container
 * @param workdir - Working directory inside the container (default: "/workspace")
 * @param diffLimit - Maximum characters for diff output (default: 10000)
 * @returns Promise<ContainerGitInfo> - Git information including branch, status, diffStat, and diff
 */
export async function getContainerGitInfo(
  containerName: string,
  workdir: string = "/workspace",
  diffLimit: number = 10000
): Promise<ContainerGitInfo> {
  // 1. Current branch (falls back to "unknown" on error)
  const branchRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git rev-parse --abbrev-ref HEAD",
    cwd: workdir,
  })
  const currentBranch =
    branchRes.exitCode === 0 ? branchRes.stdout.trim() : "unknown"

  // 2. Status (porcelain to keep parsing simple)
  const statusRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git status --porcelain",
    cwd: workdir,
  })
  const status = statusRes.exitCode === 0 ? statusRes.stdout.trim() : ""

  // 3. Diff against origin/main (stat summary) – ignore failures (e.g. branch missing)
  const diffStatRes = await execInContainerWithDockerode({
    name: containerName,
    command:
      "git fetch origin main --quiet || true && git diff --stat origin/main",
    cwd: workdir,
  })
  const diffStat = diffStatRes.exitCode === 0 ? diffStatRes.stdout.trim() : ""

  // 4. Full diff (may be large) – cap at diffLimit characters to avoid blowing up payload
  const diffRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git diff origin/main",
    cwd: workdir,
  })
  let diff = diffRes.exitCode === 0 ? diffRes.stdout : ""
  if (diff.length > diffLimit) {
    diff =
      diff.slice(0, diffLimit) +
      `\n... (truncated ${diff.length - diffLimit} chars)`
  }

  return {
    branch: currentBranch,
    status,
    diffStat,
    diff,
  }
}
