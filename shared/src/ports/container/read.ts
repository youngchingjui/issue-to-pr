export interface RunningContainer {
  /** Container ID */
  id: string
  /** Container name */
  name: string
  /** Docker image used by the container */
  image: string
  /** Container status string */
  status: string
}

export interface ContainerReadPort {
  /**
   * Get the current status of a Docker container.
   * @param containerName - Container name or ID
   * @returns Promise with container status string
   */
  getStatus(containerName: string): Promise<string>

  /**
   * List currently running containers.
   * @returns Promise with list of running containers
   */
  listRunningContainers(): Promise<RunningContainer[]>

  /**
   * List container names matching a set of Docker label filters.
   * @param labels - Label filters to match
   * @returns Promise with list of matching container names
   */
  listContainersByLabels(labels: Record<string, string>): Promise<string[]>

  /**
   * Get the current status of a Docker container.
   * @param containerName - Container name or ID
   * @returns Promise with container status string
   */
  getContainerStatus(containerName: string): Promise<string>
}
