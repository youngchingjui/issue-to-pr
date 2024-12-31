import { promises as fs } from "fs"
import path from "path"
import os from "os"

export async function createTempRepoDir(repoName: string): Promise<string> {
  try {
    // Creates a temporary directory for the repo
    // The repo directory can be deleted at any time, be sure all info is saved in cloud
    const tempDir = path.join(os.tmpdir(), "git-repos", repoName)

    // Create directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true })

    return tempDir
  } catch (error) {
    throw new Error("Failed to create temporary directory")
  }
}
