import { ContainerReadPort } from "@/shared/src/ports/container/read"

export type GetContainerStatusParams = {
  /** Container name or ID to check */
  containerName: string
}

export type GetContainerStatusResult = {
  /** Container status string */
  status: string
  /** Whether the container is currently running */
  isRunning: boolean
}

/**
 * Use case: Get the current status of a Docker container.
 *
 * This use case provides a clean interface for checking container status.
 * Possible statuses include: "created", "running", "paused", "restarting",
 * "removing", "exited", "dead", "not_found", or "unknown".
 *
 * @param params - Parameters for status check
 * @param containerPort - Port for container operations
 * @returns Promise with container status information
 */
export async function getContainerStatus(
  params: GetContainerStatusParams,
  containerPort: ContainerReadPort
): Promise<GetContainerStatusResult> {
  const { containerName } = params

  if (!containerName?.trim()) {
    return {
      status: "not_found",
      isRunning: false,
    }
  }

  const status = await containerPort.getContainerStatus(containerName.trim())

  return {
    status,
    isRunning: status === "running",
  }
}
