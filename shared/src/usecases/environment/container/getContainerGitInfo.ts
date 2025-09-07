import { ContainerReadPort } from "@/shared/src/ports/container/read"
import { ContainerWritePort } from "@/shared/src/ports/container/write"

export type GetContainerGitInfoParams = {
  /** Name of the running container */
  containerName: string
  /** Working directory inside the container (default: "/workspace") */
  workdir?: string
  /** Maximum characters for diff output (default: 10000) */
  diffLimit?: number
}

export type ContainerGitInfo = {
  /** Current branch name */
  branch: string
  /** Git status output (porcelain format) */
  status: string
  /** Diff statistics against origin/main */
  diffStat: string
  /** Full diff against origin/main (may be truncated) */
  diff: string
}

export type GetContainerGitInfoResult = ContainerGitInfo

/**
 * Use case: Extract git information from a running container.
 *
 * This use case provides a clean interface for getting git information
 * from containers, including current branch, status, and diff information.
 * It executes a series of git commands inside the container and returns
 * structured information useful for surfacing in the UI.
 *
 * @param params - Parameters for git info extraction
 * @param containerPort - Port for container operations
 * @returns Promise with git information
 */
export async function getContainerGitInfo(
  params: GetContainerGitInfoParams,
  containerPort: ContainerReadPort & ContainerWritePort
): Promise<GetContainerGitInfoResult> {
  const { containerName, workdir = "/workspace", diffLimit = 10000 } = params

  if (!containerName?.trim()) {
    return {
      branch: "unknown",
      status: "",
      diffStat: "",
      diff: "",
    }
  }

  // 1. Get current branch (falls back to "unknown" on error)
  const branchResult = await containerPort.executeCommand({
    containerName: containerName.trim(),
    command: "git rev-parse --abbrev-ref HEAD",
    workingDirectory: workdir,
  })
  const currentBranch =
    branchResult.exitCode === 0 ? branchResult.stdout.trim() : "unknown"

  // 2. Get status (porcelain to keep parsing simple)
  const statusResult = await containerPort.executeCommand({
    containerName: containerName.trim(),
    command: "git status --porcelain",
    workingDirectory: workdir,
  })
  const status = statusResult.exitCode === 0 ? statusResult.stdout.trim() : ""

  // 3. Get diff against origin/main (stat summary) – ignore failures
  const diffStatResult = await containerPort.executeCommand({
    containerName: containerName.trim(),
    command:
      "git fetch origin main --quiet || true && git diff --stat origin/main",
    workingDirectory: workdir,
  })
  const diffStat =
    diffStatResult.exitCode === 0 ? diffStatResult.stdout.trim() : ""

  // 4. Get full diff (may be large) – cap at diffLimit characters
  const diffResult = await containerPort.executeCommand({
    containerName: containerName.trim(),
    command: "git diff origin/main",
    workingDirectory: workdir,
  })
  let diff = diffResult.exitCode === 0 ? diffResult.stdout : ""
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
