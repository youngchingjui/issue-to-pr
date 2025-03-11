// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"
import { promises as fs } from "fs"
import path from "path"

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
  cwd: string = null
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
  cwd: string = null
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
  cwd: string = null
): Promise<string> {
  const command = `git push origin ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
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
      console.debug(`[DEBUG] Command output: ${stdout}`)
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
  dir: string = null
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
