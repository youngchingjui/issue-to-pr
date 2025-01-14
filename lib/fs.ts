// File system operations
import { promises as fs, existsSync } from "fs";
import os from "os";
import * as path from "path";

export async function createDirectoryTree(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  // Generate a list of all files in the directory
  // Does not include folders, node_modules, or hidden files or folders

  let output: string[] = [];
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);

    // Skip node_modules
    if (file === "node_modules") {
      continue;
    }

    // Skip hidden folders and files
    if (file.startsWith(".")) {
      continue;
    }

    // If it's a directory, recurse
    if (stats.isDirectory()) {
      const subDirFiles = await createDirectoryTree(filePath, baseDir);
      output = output.concat(subDirFiles);
    } else {
      // Only add files to the output
      const relativePath = path.relative(baseDir, filePath);
      output.push(relativePath);
    }
  }

  return output;
}

export async function getRepoDir(repoOwner: string, repoName: string) {
  // Returns the temp directory path for the locally saved repo
  // Does not determine if the repo exists already
  // If temp dir does not exist, it will be created

  // Requires the repo owner and name
  const dirPath = path.join(os.tmpdir(), "git-repos", repoOwner, repoName);

  // Create directory if it doesn't exist
  console.debug(`[DEBUG] Getting temporary directory: ${dirPath}`);
  await fs.mkdir(dirPath, { recursive: true });

  return dirPath;
}

export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath); // Checks if the file can be accessed
    return true;
  } catch (error) {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  // Uses fs.existsSync() to check if a file exists synchronously
  return existsSync(filePath);
}

export async function getFileContent(baseDir: string, filePath: string) {
  const fullPath = path.join(baseDir, filePath);
  if (!await checkFileExists(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const file = await fs.readFile(fullPath);
  return file.toString();
}

export async function checkAndPrepareFile(filePath: string, shouldCreate: boolean): Promise<boolean> {
    try {
        // Check if the file exists
        if (await checkFileExists(filePath)) {
            return true; // File exists
        } else if (shouldCreate) {
            // If shouldCreate is true, create the directory structure if necessary
            const dir = path.dirname(filePath);
            if (!await checkFileExists(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
            // Create the file
            await fs.writeFile(filePath, '');
            return true; // File was created
        }
        return false; // File does not exist and should not be created
    } catch (error) {
        console.error(`Error checking or preparing file: ${error}`);
        return false;
    }
}