/**
 * @deprecated
 * This file is deprecated. Please use the functions from "shared/src/lib/docker.ts" instead.
 */
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
  // 1. Build volume flags: -v "host:container[:ro]"
  const volumeFlags = mounts.map(({ hostPath, containerPath, readOnly }) => {
    const ro = readOnly ? ":ro" : ""
    return `-v \"${hostPath}:${containerPath}${ro}\"`
  })

  // 2. Build environment variable flags: -e "KEY=value"
  const envFlags = Object.entries(env).map(
    ([key, value]) => `-e \"${key}=${value.replace(/"/g, '\\\"')}\"`
  )

  // 3. Build label flags: --label key=value
  const labelFlags = labels
    ? Object.entries(labels).map(
        ([key, value]) => `--label ${key}=${String(value).replace(/\s/g, "-")}`
      )
    : []

  // 4. Build network flags: --network <name> and --network-alias <alias>
  const networkFlags: string[] = []
  if (network?.name) {
    networkFlags.push(`--network ${network.name}`)
    if (Array.isArray(network.aliases)) {
      for (const alias of network.aliases) {
        if (alias && alias.trim().length > 0) {
          networkFlags.push(`--network-alias ${alias}`)
        }
      }
    }
  }

  // 5. Determine working directory
  const wdPath = workdir ?? (mounts.length ? mounts[0].containerPath : "/")
  const wdFlag = wdPath ? `-w \"${wdPath}\"` : undefined

  // 6. Assemble command parts and filter out undefined entries
  const cmd = [
    "docker run -d",
    `--name ${name}`,
    `-u ${user}`,
    ...envFlags,
    ...labelFlags,
    ...networkFlags,
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 */
export async function stopAndRemoveContainer(id: string): Promise<void> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" })
    const container = docker.getContainer(id)

    // Attempt to stop if running; then force remove
    try {
      const info = await container.inspect()
      if (info.State?.Running) {
        await container.stop()
        console.log(`Stopped container: ${id}`)
      }
    } catch (error: unknown) {
      console.warn(`Warning inspecting/stopping container ${id}:`, error)
    }

    await container.remove({ force: true })
    console.log(`Removed container: ${id}`)
  } catch (e) {
    console.warn(`[WARNING] Failed to stop/remove container ${id}:`, e)
  }
}

/**
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 */
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
 * List currently running Docker containers.
 */
export async function listRunningContainers(): Promise<RunningContainer[]> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" })
    const containers = await docker.listContainers({
      all: true,
      filters: {
        status: ["running"],
      },
    })

    return containers.map((c) => {
      const labels = c.Labels ?? {}
      const owner = labels.owner
      const repo = labels.repo
      const branch = labels.branch
      const subdomain = labels.subdomain
      const repoFullName = owner && repo ? `${owner}/${repo}` : undefined

      return {
        id: c.Id,
        name: (c.Names?.[0] ?? "").replace(/^\//, ""),
        image: c.Image,
        status: c.State,
        ports: c.Ports?.filter((p) => typeof p.PrivatePort === "number")
          .map((p) => {
            const pub =
              typeof p.PublicPort === "number" ? p.PublicPort : undefined
            const proto = p.Type || "tcp"
            const host = p.IP && p.IP !== "0.0.0.0" ? `${p.IP}:` : ""
            return pub
              ? `${host}${pub}->${p.PrivatePort}/${proto}`
              : `${p.PrivatePort}/${proto}`
          })
          .join(", "),
        uptime: c.Status, // e.g., "Up 2 hours"
        owner,
        repo,
        repoFullName,
        branch,
        subdomain,
      }
    })
  } catch (error) {
    console.error("[ERROR] Failed to list running containers:", error)
    return []
  }
}

/**
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
 * @deprecated This function is deprecated. Use the equivalent function from "shared/src/lib/docker.ts" instead.
 *
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
