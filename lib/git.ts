// Convenience methods for running git commands in node
// All git operations are executed within their repository's Docker container via runInRepoContainer
import { promises as fs } from "fs"
import path from "path"

import { runInRepoContainer } from "@/lib/dockerExec"
import { getCloneUrlWithAccessToken } from "@/lib/utils/utils-common"

function getRepoFullNameFromPath(dir: string): string {
  // Simple heuristic: the last two path components
  // Should be compatible with /tmp/git-repos/owner/repo
  const parts = dir.split(path.sep).filter(Boolean)
  return parts.slice(-2).join("/")
}

export async function checkIfGitExists(dir: string): Promise<boolean> {
  try {
    const { stdout } = await runInRepoContainer(
      getRepoFullNameFromPath(dir),
      "test -d .git && echo git_exists",
      { cwd: "." }
    )
    return stdout.trim() === "git_exists"
  } catch {
    return false
  }
}

export async function updateToLatest(dir: string): Promise<string> {
  const command = `git fetch && git pull`
  const { stdout, stderr, code } = await runInRepoContainer(
    getRepoFullNameFromPath(dir),
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || "Failed to update repo")
  return stdout
}

export async function checkIfLocalBranchExists(
  branchName: string,
  cwd: string | undefined = undefined
): Promise<boolean> {
  const repoFullName = cwd ? getRepoFullNameFromPath(cwd) : undefined
  if (!repoFullName) throw new Error("Cannot determine repoFullName from cwd")
  const command = `git branch | grep ${branchName}`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  // grep returns code 1 if not found
  if (code === 1) return false
  if (code !== 0) throw new Error(stderr || "Failed to check branch")
  return !!stdout && stdout.trim().length > 0
}

export async function createBranch(
  branchName: string,
  cwd: string | undefined = undefined
): Promise<string> {
  const repoFullName = cwd ? getRepoFullNameFromPath(cwd) : undefined
  if (!repoFullName) throw new Error("Cannot determine repoFullName from cwd")
  const command = `git checkout -b ${branchName}`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || `Failed to create branch`)
  return stdout
}

export async function pushBranch(
  branchName: string,
  cwd: string | undefined = undefined,
  token?: string,
  repoFullName?: string
): Promise<string> {
  const oldRemoteUrl: string | null = null
  try {
    if (token && repoFullName && cwd) {
      // Set authenticated remote inside container
      const authenticatedUrl = getCloneUrlWithAccessToken(repoFullName, token)
      await runInRepoContainer(
        repoFullName,
        `git remote set-url origin \"${authenticatedUrl}\"`,
        { cwd }
      )
    }
    if (!repoFullName && cwd) repoFullName = getRepoFullNameFromPath(cwd)
    if (!repoFullName) throw new Error("No repoFullName")
    const command = `git push origin ${branchName}`
    const { stdout, stderr, code } = await runInRepoContainer(
      repoFullName,
      command,
      { cwd }
    )
    if (code !== 0) throw new Error(stderr || `Failed to push branch`)
    return stdout
  } finally {
    // Not restoring original remote for simplicity
  }
}

async function executeGitCommand(
  command: string,
  dir: string
): Promise<string> {
  const repoFullName = getRepoFullNameFromPath(dir)
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || `Failed to execute git command`)
  return stdout
}

export async function checkoutBranchQuietly(
  branchName: string,
  dir: string
): Promise<string> {
  const command = `git checkout -q ${branchName}`
  return executeGitCommand(command, dir)
}

export async function cleanUntrackedFiles(dir: string): Promise<string> {
  const command = `git clean -fd`
  return executeGitCommand(command, dir)
}

export async function fetchLatest(dir: string): Promise<string> {
  const command = `git fetch`
  return executeGitCommand(command, dir)
}

export async function resetToOrigin(
  branchName: string,
  dir: string
): Promise<string> {
  const command = `git reset --hard origin/${branchName}`
  return executeGitCommand(command, dir)
}

export async function cleanCheckout(branchName: string, dir: string) {
  try {
    await cleanUntrackedFiles(dir)
    await fetchLatest(dir)
    await executeGitCommand("git rm --cached -r .", dir)
    await resetToOrigin(branchName, dir)
    await checkoutBranchQuietly(branchName, dir)
  } catch (error) {
    console.error(`[ERROR] Failed during clean checkout: ${error}`)
    throw error
  }
}

export async function cloneRepo(
  cloneUrl: string,
  dir: string | undefined = undefined
): Promise<string> {
  if (!dir) throw new Error("Target directory is required for cloning.")
  // Perform clone from within the repo's future container
  const repoFullName = getRepoFullNameFromPath(dir)
  const command = `git clone ${cloneUrl} .`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || `Failed to clone repo`)
  return stdout
}

export async function getLocalFileContent(filePath: string): Promise<string> {
  // use os to get file content
  // Return error if file does not exist
  const fileContent = await fs.readFile(filePath, "utf8")
  return fileContent
}

export async function getDiff(dir: string): Promise<string> {
  const repoFullName = getRepoFullNameFromPath(dir)
  const command = `git diff`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || `Failed to get diff`)
  return stdout
}

export async function checkRepoIntegrity(dir: string): Promise<boolean> {
  const repoFullName = getRepoFullNameFromPath(dir)
  try {
    await runInRepoContainer(repoFullName, "git fsck", { cwd: "." })
    return true
  } catch (error) {
    console.error(`[ERROR] Repository integrity check failed: ${error}`)
    return false
  }
}

export async function cleanupRepo(dir: string): Promise<void> {
  const fsPromises = fs
  const repoFullName = getRepoFullNameFromPath(dir)
  try {
    await fsPromises.rm(path.join(dir, ".git"), {
      recursive: true,
      force: true,
    })
    await fsPromises.rm(dir, { recursive: true, force: true })
  } catch (error) {
    console.error(`[ERROR] Failed to cleanup repository: ${error}`)
    throw error
  }
}

export async function ensureValidRepo(
  dir: string,
  cloneUrl: string
): Promise<void> {
  const gitExists = await checkIfGitExists(dir)
  if (!gitExists) {
    await cloneRepo(cloneUrl, dir)
    return
  }
  const isValid = await checkRepoIntegrity(dir)
  if (!isValid) {
    console.warn(
      "[WARNING] Repository corruption detected, cleaning up and re-cloning"
    )
    await cleanupRepo(dir)
    await cloneRepo(cloneUrl, dir)
  }
}

export async function stageFile(
  filePath: string,
  cwd: string | undefined = undefined
): Promise<string> {
  const repoFullName = cwd ? getRepoFullNameFromPath(cwd) : undefined
  if (!repoFullName) throw new Error("Cannot determine repoFullName from cwd")
  const command = `git add \"${filePath}\"`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd }
  )
  if (code !== 0) throw new Error(stderr || `Failed to stage file`)
  return stdout
}

export async function createCommit(
  message: string,
  cwd: string | undefined = undefined
): Promise<string> {
  const repoFullName = cwd ? getRepoFullNameFromPath(cwd) : undefined
  if (!repoFullName) throw new Error("Cannot determine repoFullName from cwd")
  const safeMsg = message.replace(/"/g, '\\"')
  const command = `git commit -m \"${safeMsg}\"`
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd }
  )
  if (code !== 0) throw new Error(stderr || `Failed to create commit`)
  return stdout
}

export async function getCommitHash(
  cwd: string | undefined = undefined
): Promise<string> {
  const repoFullName = cwd ? getRepoFullNameFromPath(cwd) : undefined
  if (!repoFullName) throw new Error("Cannot determine repoFullName from cwd")
  const command = "git rev-parse HEAD"
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd }
  )
  if (code !== 0) throw new Error(stderr || `Failed to get commit hash`)
  return stdout.trim()
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const repoFullName = getRepoFullNameFromPath(repoPath)
  const command = "git rev-parse --abbrev-ref HEAD"
  const { stdout, stderr, code } = await runInRepoContainer(
    repoFullName,
    command,
    { cwd: "." }
  )
  if (code !== 0) throw new Error(stderr || `Failed to get current branch`)
  return stdout.trim()
}
