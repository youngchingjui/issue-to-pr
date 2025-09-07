import type { ContainerWritePort } from "@shared/ports/container/write"

export type WriteFileInContainerParams = {
  /** Container name or ID */
  containerName: string
  /** Base working directory inside the container */
  workdir: string
  /** Relative file path from workdir */
  relPath: string
  /** File contents to write */
  contents: string
  /** Whether to create parent directories if they don't exist */
  makeDirs?: boolean
}

export type WriteFileInContainerResult = {
  /** Standard output from the write operation */
  stdout: string
  /** Standard error from the write operation */
  stderr: string
  /** Exit code of the write operation */
  exitCode: number
  /** Full path where the file was written */
  fullPath: string
}

/**
 * Use case: Write file contents to a path inside a running container.
 *
 * This use case provides a clean interface for writing files to containers.
 * It handles path construction, directory creation, and safe file writing
 * using heredoc syntax to avoid escaping issues.
 *
 * @param params - Parameters for file writing
 * @param containerPort - Port for container operations
 * @returns Promise with write operation results
 */
export async function writeFileInContainer(
  params: WriteFileInContainerParams,
  containerPort: ContainerWritePort
): Promise<WriteFileInContainerResult> {
  const { containerName, workdir, relPath, contents, makeDirs = false } = params

  if (!containerName?.trim()) {
    return {
      stdout: "",
      stderr: "Container name must not be empty",
      exitCode: 1,
      fullPath: "",
    }
  }

  if (!workdir?.trim()) {
    return {
      stdout: "",
      stderr: "Working directory must not be empty",
      exitCode: 1,
      fullPath: "",
    }
  }

  if (!relPath?.trim()) {
    return {
      stdout: "",
      stderr: "Relative path must not be empty",
      exitCode: 1,
      fullPath: "",
    }
  }

  // Validate that relPath doesn't contain path traversal attempts
  if (relPath.includes("..") || relPath.startsWith("/")) {
    return {
      stdout: "",
      stderr: "Relative path must not contain path traversal or absolute paths",
      exitCode: 1,
      fullPath: "",
    }
  }

  // Construct the full path
  const cleanWorkdir = workdir.replace(/\/$/, "")
  const fullPath = `${cleanWorkdir}/${relPath}`

  const result = await containerPort.writeFile({
    containerName: containerName.trim(),
    workdir: cleanWorkdir,
    relPath: relPath.trim(),
    contents,
    makeDirs,
  })

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    fullPath,
  }
}
