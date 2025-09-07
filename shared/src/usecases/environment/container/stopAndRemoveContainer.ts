import type { ContainerWritePort } from "@shared/ports/container/write"

export type StopAndRemoveContainerParams = {
  /** Container name or ID to stop and remove */
  containerName: string
}

export type StopAndRemoveContainerResult = {
  /** Whether the operation was successful */
  success: boolean
  /** Optional error message if the operation failed */
  error?: string
}

/**
 * Use case: Stop and remove a Docker container.
 *
 * This use case provides a clean interface for cleaning up containers.
 * It will attempt to stop the container if it's running and then remove it.
 * The operation is designed to be safe and will not throw errors if the
 * container doesn't exist or is already stopped.
 *
 * @param params - Parameters for container cleanup
 * @param containerPort - Port for container operations
 * @returns Promise with operation result
 */
export async function stopAndRemoveContainer(
  params: StopAndRemoveContainerParams,
  containerPort: ContainerWritePort
): Promise<StopAndRemoveContainerResult> {
  const { containerName } = params

  if (!containerName?.trim()) {
    return {
      success: false,
      error: "Container name must not be empty",
    }
  }

  try {
    await containerPort.stop(containerName.trim())
    await containerPort.remove(containerName.trim())
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
