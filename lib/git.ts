// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"

export async function checkIfLocalBranchExists(
  branchName: string
): Promise<boolean> {
  const command = `git show-ref refs/heads/${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(stdout.includes(branchName))
    })
  })
}

export async function createBranch(branchName: string): Promise<string> {
  const command = `git checkout -b ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function checkoutBranch(branchName: string): Promise<string> {
  // Checks out branch. Returns error if branch does not exist
  const command = `git checkout ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
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
