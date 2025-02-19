// File system operations
import { promises as fs } from "fs"
import os from "os"
import * as path from "path"

export async function createDirectoryTree(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  // Generate a list of all files in the directory
  // Does not include folders, node_modules, or hidden files or folders

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

  // Verify if the directory was created
  const dirExists = await fs
    .stat(dirPath)
    .then(() => true)
    .catch(() => false)
  console.debug(`[DEBUG] Directory exists after creation attempt: ${dirExists}`)

  return dirPath
}

export async function getFileContent(filePath: string) {
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
