import type { ContainerWritePort } from "@shared/ports/container/write"

export type StartContainerParams = {
  /** Docker image to start */
  image: string
  /** Name to assign to the container (must be unique) */
  name: string
  /** UID:GID string to run the container as; defaults to non-root "1000:1000" */
  user?: string
  /** Host paths to bind-mount into the container */
  mounts?: Array<{
    hostPath: string
    containerPath: string
    readOnly?: boolean
  }>
  /** Working directory inside the container (defaults to first mount or "/") */
  workdir?: string
  /** Environment variables to set inside the container */
  env?: Record<string, string>
  /** Labels to set on the container (e.g. preview=true) */
  labels?: Record<string, string>
  /** Network to join and optional aliases to register */
  network?: {
    name: string
    aliases?: string[]
  }
}

export type StartContainerResult = {
  /** The ID of the started container */
  containerId: string
}

/**
 * Use case: Start a detached Docker container that stays alive for command execution.
 *
 * This use case provides a clean interface for starting containers with various
 * configuration options including mounts, environment variables, and networking.
 * The container runs `tail -f /dev/null` to keep it alive for subsequent operations.
 *
 * @param params - Parameters for container startup
 * @param containerPort - Port for container operations
 * @returns Promise with the started container ID
 */
export async function startContainer(
  params: StartContainerParams,
  containerPort: ContainerWritePort
): Promise<StartContainerResult> {
  const {
    image,
    name,
    user = "1000:1000",
    mounts = [],
    workdir,
    env = {},
    labels,
    network,
  } = params

  if (!image?.trim()) {
    throw new Error("Image must not be empty")
  }

  if (!name?.trim()) {
    throw new Error("Container name must not be empty")
  }

  // Validate mount paths
  for (const mount of mounts) {
    if (!mount.hostPath?.trim() || !mount.containerPath?.trim()) {
      throw new Error("Mount paths must not be empty")
    }
  }

  // Validate environment variables
  for (const [key, value] of Object.entries(env)) {
    if (!key?.trim()) {
      throw new Error("Environment variable keys must not be empty")
    }
    if (value === undefined || value === null) {
      throw new Error(
        `Environment variable ${key} value must not be null/undefined`
      )
    }
  }

  const containerId = await containerPort.start({
    image: image.trim(),
    name: name.trim(),
    user,
    mounts,
    workdir,
    env,
    labels,
    network,
  })

  return { containerId }
}
