import { promises as fs } from "fs"
import os from "os"
import path from "path"

import type { FileSystemPort } from "@/core/ports/FileSystemPort.js"

export class FileSystemAdapter implements FileSystemPort {
  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  getTempDir(): string {
    return os.tmpdir()
  }

  async readFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, "utf-8")
    return content
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure the directory exists
    const dirPath = path.dirname(filePath)
    await this.createDirectory(dirPath)

    await fs.writeFile(filePath, content, "utf-8")
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore errors if directory doesn't exist
      console.warn(`Failed to delete directory ${dirPath}:`, error)
    }
  }
}
