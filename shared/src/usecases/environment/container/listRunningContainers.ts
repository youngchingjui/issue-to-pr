import type { ContainerReadPort } from "@shared/ports/container/read"

export type RunningContainer = {
  /** Container ID */
  id: string
  /** Container name */
  name: string
  /** Docker image used by the container */
  image: string
  /** Container status string */
  status: string
}

export type ListRunningContainersParams = {
  /** Optional labels to filter containers by */
  labels?: Record<string, string>
}

export type ListRunningContainersResult = {
  /** List of running containers */
  containers: RunningContainer[]
}

/**
 * Use case: List currently running Docker containers.
 *
 * This use case provides a clean interface for discovering running containers.
 * It can optionally filter containers by labels for more targeted results.
 *
 * @param params - Parameters for container listing
 * @param containerPort - Port for container operations
 * @returns Promise with list of running containers
 */
export async function listRunningContainers(
  params: ListRunningContainersParams = {},
  containerPort: ContainerReadPort
): Promise<ListRunningContainersResult> {
  const { labels } = params

  // If labels are provided, use the label-based filtering
  if (labels && Object.keys(labels).length > 0) {
    const containerNames = await containerPort.listContainersByLabels(labels)

    // Get detailed info for each container
    const containers: RunningContainer[] = []
    for (const name of containerNames) {
      const status = await containerPort.getContainerStatus(name)
      if (status === "running") {
        // For now, we'll create a basic container object
        // In a real implementation, you might want to get more details
        containers.push({
          id: name, // Using name as ID for simplicity
          name,
          image: "unknown", // Would need additional API call to get image
          status,
        })
      }
    }

    return { containers }
  }

  // Otherwise, list all running containers
  const containers = await containerPort.listRunningContainers()
  return { containers }
}
