// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"

export async function checkoutBranch(branchName: string) {
  const command = `git checkout -b ${branchName}`
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return Promise.reject(new Error(error.message))
    }
    if (stderr) {
      return Promise.reject(new Error(stderr))
    }
    return Promise.resolve(stdout)
  })
}
