// File system operations
import { promises as fs } from "fs"
import os from "os"
import * as path from "path"

import { checkIfGitExists } from "@/lib/git"

export async function createDirectoryTree(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  // Generate a list of all files in the directory
  // Does not include folders, node_modules, or hidden files or folders

  // TODO: We should just use `tree` instead.

  let output: string[] = []
  const files = await fs.readdir(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stats = await fs.stat(filePath)

    // Skip node_modules
    if (file === "node_modules") {
      continue
    }

    // Skip hidden folders and files
    if (file.startsWith(".")) {
      continue
    }

    // If it's a directory, recurse
    if (stats.isDirectory()) {
      const subDirFiles = await createDirectoryTree(filePath, baseDir)
      output = output.concat(subDirFiles)
    } else {
      // Only add files to the output
      const relativePath = path.relative(baseDir, filePath)
      output.push(relativePath)
    }
  }

  return output
}

export async function getLocalRepoDir(repo_full_name: string) {
  // Args
  // - repo_full_name: The full name of the repository, e.g. "youngchingjui/issue-to-pr"

  // Returns the temp directory path for the locally saved repo
  // Does not determine if the repo exists already
  // If temp dir does not exist, it will be created

  const dirPath = path.join(os.tmpdir(), "git-repos", repo_full_name)

  try {
    // Create directory if it doesn't exist
    console.debug(`[DEBUG] Getting temporary directory: ${dirPath}`)
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    console.error(`[ERROR] Failed to create directory: ${error}`)
    throw error
  }

  return dirPath
}

export async function getFileContent(filePath: string) {
  const stats = await fs.stat(filePath)
  if (stats.isDirectory()) {
    const err = new Error(
      `Cannot read content of a directory: ${filePath}`
    ) as Error & { code: string }
    err.code = "EISDIR"
    throw err
  }
  const file = await fs.readFile(filePath)
  return file.toString()
}

export async function writeFile(fullPath: string, content: string) {
  // Ensure the directory exists
  const dirPath = path.dirname(fullPath)
  await fs.mkdir(dirPath, { recursive: true })

  // Write the file
  await fs.writeFile(fullPath, content, "utf-8")
}

export async function checkLocalRepo(
  repoFullName: string
): Promise<{ exists: boolean; path: string }> {
  try {
    const dir = await getLocalRepoDir(repoFullName)
    const exists = await checkIfGitExists(dir)
    return { exists, path: dir }
  } catch (e) {
    // If there's any error, assume not exists and return unavailable path
    return { exists: false, path: "" }
  }
}
