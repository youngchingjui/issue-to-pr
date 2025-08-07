import { exec } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import util from "util"

import type { GitPort } from "@/core/ports/GitPort.js"

const execPromise = util.promisify(exec)

export class GitAdapter implements GitPort {
  async cloneRepository(cloneUrl: string, localPath: string): Promise<void> {
    const command = `git clone "${cloneUrl}" "${localPath}"`
    await execPromise(command)
  }

  async isGitRepository(repoPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(repoPath, ".git"))
      return true
    } catch {
      return false
    }
  }

  async fetchLatest(path: string): Promise<void> {
    const command = "git fetch"
    await execPromise(command, { cwd: path })
  }

  async checkoutBranch(branch: string, path: string): Promise<void> {
    const command = `git checkout ${branch}`
    await execPromise(command, { cwd: path })
  }

  async setRemoteOrigin(path: string, remoteUrl: string): Promise<void> {
    const command = `git remote set-url origin "${remoteUrl}"`
    await execPromise(command, { cwd: path })
  }

  async cleanCheckout(branch: string, path: string): Promise<void> {
    // Reset to origin and clean untracked files
    const commands = [
      `git reset --hard origin/${branch}`,
      `git clean -fd`,
      `git checkout ${branch}`,
    ]

    for (const command of commands) {
      await execPromise(command, { cwd: path })
    }
  }

  async getCurrentBranch(path: string): Promise<string> {
    const command = "git branch --show-current"
    const { stdout } = await execPromise(command, { cwd: path })
    return stdout.trim()
  }

  async createBranch(branchName: string, path: string): Promise<void> {
    const command = `git checkout -b ${branchName}`
    await execPromise(command, { cwd: path })
  }

  async pushBranch(branchName: string, path: string): Promise<void> {
    const command = `git push origin ${branchName}`
    await execPromise(command, { cwd: path })
  }
}
