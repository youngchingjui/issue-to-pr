export interface FileSystemPort {
  /**
   * Create a directory and all its parent directories
   */
  createDirectory(path: string): Promise<void>

  /**
   * Check if a directory exists
   */
  directoryExists(path: string): Promise<boolean>

  /**
   * Get the temporary directory path
   */
  getTempDir(): string

  /**
   * Read file content as string
   */
  readFile(path: string): Promise<string>

  /**
   * Write content to a file
   */
  writeFile(path: string, content: string): Promise<void>

  /**
   * Delete a directory and all its contents
   */
  deleteDirectory(path: string): Promise<void>
}
