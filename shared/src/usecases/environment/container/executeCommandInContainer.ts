import type { ContainerWritePort } from "@shared/ports/container/write"

export type ExecuteCommandInContainerParams = {
  /** Container name or ID */
  containerName: string
  /** Shell command to run inside the container */
  command: string
  /** Optional working directory inside the container */
  workingDirectory?: string
}

export type ExecuteCommandInContainerResult = {
  /** Standard output from the command */
  stdout: string
  /** Standard error from the command */
  stderr: string
  /** Exit code of the command */
  exitCode: number
}

/**
 * Use case: Execute a shell command inside a running Docker container.
 *
 * This use case provides a clean interface for running commands in containers
 * without coupling to specific Docker implementations. The container port handles
 * the actual Docker communication.
 *
 * @param params - Parameters for command execution
 * @param containerPort - Port for container operations
 * @returns Promise with command execution results
 */
export async function executeCommandInContainer(
  params: ExecuteCommandInContainerParams,
  containerPort: ContainerWritePort
): Promise<ExecuteCommandInContainerResult> {
  const { containerName, command, workingDirectory } = params

  if (!containerName?.trim()) {
    return {
      stdout: "",
      stderr: "Container name must not be empty",
      exitCode: 1,
    }
  }

  if (!command?.trim()) {
    return {
      stdout: "",
      stderr: "Command must not be empty",
      exitCode: 1,
    }
  }

  return await containerPort.executeCommand({
    containerName: containerName.trim(),
    command: command.trim(),
    workingDirectory: workingDirectory?.trim(),
  })
}
