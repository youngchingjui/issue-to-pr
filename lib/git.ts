// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"

export async function checkIfLocalBranchExists(
  branchName: string
): Promise<boolean> {
  const command = `git show-ref --verify --quiet refs/heads/${branchName}`
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

export async function checkoutBranch(branchName: string): Promise<string> {
  // Checkouts the branch and creates it if it doesn't exist
  const command = `git checkout -B ${branchName}`
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
