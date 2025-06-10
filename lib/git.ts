// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import util from "util"

import { getCloneUrlWithAccessToken } from "@/lib/utils/utils-common"

const execPromise = util.promisify(exec)

export async function checkIfGitExists(dir: string): Promise<boolean> {
  return await fs
    .access(path.join(dir, ".git"))
    .then(() => true)
    .catch(() => false)
}

export async function updateToLatest(dir: string): Promise<string> {
  // Fetches then pulls to latest branch
  const command = `git fetch && git pull`
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function checkIfLocalBranchExists(
  branchName: string,
  cwd: string | undefined = undefined
): Promise<boolean> {
  // Lists all local branches and greps given branchName
  const command = `git branch | grep ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      // grep returns exit code 1 when no matches are found
      // but other error codes indicate real errors
      if (error && error.code !== 1) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(!!stdout && stdout.trim().length > 0)
    })
  })
}

export async function createBranch(
  branchName: string,
  cwd: string | undefined = undefined
): Promise<string> {
  const command = `git checkout -b ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function pushBranch(
  branchName: string,
  cwd: string | undefined = undefined,
  token?: string,
  repoFullName?: string
): Promise<string> {
  let oldRemoteUrl: string | null = null
  try {
    if (token && repoFullName) {
      // Get current origin URL
      const { stdout: originalUrl } = await execPromise(
        "git remote get-url origin",
        { cwd }
      )
      oldRemoteUrl = originalUrl.trim()
      // Set authenticated remote
      const authenticatedUrl = getCloneUrlWithAccessToken(repoFullName, token)
      await execPromise(`git remote set-url origin "${authenticatedUrl}"`, {
        cwd,
      })
    }
    const command = `git push origin ${branchName}`
    const { stdout } = await execPromise(command, { cwd })
    return stdout
  } finally {
    // Restore the original remote if we changed it
    if (token && repoFullName && oldRemoteUrl) {
      try {
        await execPromise(`git remote set-url origin "${oldRemoteUrl}"`, {
          cwd,
        })
      } catch (e) {
        // Fail quietly, as this is cleanup
      }
    }
  }
}

async function executeGitCommand(
  command: string,
  dir: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[ERROR] Command failed: ${command}\n${error.message}`)
        return reject(
          new Error(`Failed to execute git command: ${error.message}`)
        )
      }
      if (stderr) {
        console.warn(`[WARNING] Command produced stderr: ${stderr}`)
      }
      return resolve(stdout)
    })
  })
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
    // First clean any untracked files
    await cleanUntrackedFiles(dir)

    // Fetch latest changes
    await fetchLatest(dir)

    // Force clean the index before reset
    await executeGitCommand("git rm --cached -r .", dir)

    // Reset to origin
    await resetToOrigin(branchName, dir)

    // Checkout the branch
    await checkoutBranchQuietly(branchName, dir)
  } catch (error) {
    console.error(`[ERROR] Failed during clean checkout: ${error.message}`)
    throw error
  }
}

export async function cloneRepo(
  cloneUrl: string,
  dir: string | undefined = undefined
): Promise<string> {
  const command = `git clone ${cloneUrl}${dir ? ` ${dir}` : ""}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function getLocalFileContent(filePath: string): Promise<string> {
  // use os to get file content
  // Return error if file does not exist
  const fileContent = await fs.readFile(filePath, "utf8")
  return fileContent
}

export async function getDiff(dir: string): Promise<string> {
  // Returns the git diff of the current branch in the `dir`
  const command = `git diff`
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function checkRepoIntegrity(dir: string): Promise<boolean> {
  try {
    // Run git fsck to check repository integrity
    await executeGitCommand("git fsck", dir)
    return true
  } catch (error) {
    console.error(`[ERROR] Repository integrity check failed: ${error.message}`)
    return false
  }
}

export async function cleanupRepo(dir: string): Promise<void> {
  try {
    // Remove the .git directory to force a fresh clone
    await fs.rm(path.join(dir, ".git"), { recursive: true, force: true })
    // Also remove any tracked files that might be corrupted
    await fs.rm(dir, { recursive: true, force: true })
  } catch (error) {
    console.error(`[ERROR] Failed to cleanup repository: ${error.message}`)
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
  const command = `git add "${filePath}"`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(stdout)
    })
  })
}

export async function createCommit(
  message: string,
  cwd: string | undefined = undefined
): Promise<string> {
  const command = `git commit -m "${message.replace(/"/g, '\\"')}"`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        console.warn(`[WARNING] Commit produced stderr: ${stderr}`)
      }
      return resolve(stdout)
    })
  })
}

export async function getCommitHash(
  cwd: string | undefined = undefined
): Promise<string> {
  const command = "git rev-parse HEAD"
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(stdout.trim())
    })
  })
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execPromise("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
    })
    return stdout.trim()
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Failed to get current branch: " + error.message)
    } else {
      throw new Error("Failed to get current branch: Unknown error")
    }
  }
}
