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

export async function checkoutBranch(
  branchName: string,
  cwd: string = null
): Promise<string> {
  // Updated to support worktrees.
  const command = `git worktree add --checkout ${cwd} ${branchName}`
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

export async function cloneRepo(
  cloneUrl: string,
  dir: string = null
): Promise<string> {
  // Assume cloneRepo is for initial clone; can be reused with worktrees
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

export async function createWorktree(
  worktreePath: string,
  branchName: string,
  cwd: string = null
): Promise<string> {
  // Create a new worktree linked to a branch
  const command = `git worktree add ${worktreePath} ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function removeWorktree(
  worktreePath: string,
  force: boolean = false,
  cwd: string = null
): Promise<string> {
  // Remove the specified worktree
  const command = `git worktree remove ${force ? '--force ' : ''}${worktreePath}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout) => {
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

export async function stash(dir: string): Promise<string> {
  const command = `git stash`
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}
