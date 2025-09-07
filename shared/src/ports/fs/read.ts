export interface FileInfo {
  /** File path */
  path: string
  /** File size in bytes */
  size: number
  /** Whether this is a directory */
  isDirectory: boolean
  /** Whether this is a file */
  isFile: boolean
  /** Last modified timestamp */
  lastModified: Date
}

export interface DirectoryEntry {
  /** Entry name */
  name: string
  /** Full path to the entry */
  path: string
  /** Whether this is a directory */
  isDirectory: boolean
  /** Whether this is a file */
  isFile: boolean
}

export interface FSReadPort {
  /**
   * Check if a file or directory exists at the given path.
   * @param path - Path to check
   * @returns Promise with boolean indicating existence
   */
  exists(path: string): Promise<boolean>

  /**
   * Get file or directory information.
   * @param path - Path to get info for
   * @returns Promise with file information
   * @throws Error if path doesn't exist
   */
  getFileInfo(path: string): Promise<FileInfo>

  /**
   * Read the contents of a file as a string.
   * @param path - Path to the file
   * @param encoding - Text encoding (default: 'utf-8')
   * @returns Promise with file contents
   * @throws Error if path doesn't exist or is not a file
   */
  readFile(path: string, encoding?: string): Promise<string>

  /**
   * Read the contents of a file as a Buffer.
   * @param path - Path to the file
   * @returns Promise with file contents as Buffer
   * @throws Error if path doesn't exist or is not a file
   */
  readFileBuffer(path: string): Promise<Buffer>

  /**
   * List directory contents.
   * @param path - Path to the directory
   * @returns Promise with array of directory entries
   * @throws Error if path doesn't exist or is not a directory
   */
  readDirectory(path: string): Promise<DirectoryEntry[]>

  /**
   * Recursively get all files in a directory tree.
   * Excludes node_modules, hidden files/folders, and directories themselves.
   * @param path - Path to the directory
   * @param basePath - Base path for relative path calculation (defaults to path)
   * @returns Promise with array of relative file paths
   */
  getDirectoryTree(path: string, basePath?: string): Promise<string[]>

  /**
   * Get the temporary directory path for the current system.
   * @returns Promise with temporary directory path
   */
  getTempDirectory(): Promise<string>

  /**
   * Get the current working directory.
   * @returns Promise with current working directory path
   */
  getCurrentWorkingDirectory(): Promise<string>

  /**
   * Resolve a path relative to the current working directory.
   * @param path - Path to resolve
   * @returns Promise with resolved absolute path
   */
  resolvePath(path: string): Promise<string>

  /**
   * Get the directory name of a path.
   * @param path - Path to get directory name for
   * @returns Promise with directory name
   */
  getDirectoryName(path: string): Promise<string>

  /**
   * Get the base name (filename) of a path.
   * @param path - Path to get base name for
   * @returns Promise with base name
   */
  getBaseName(path: string): Promise<string>

  /**
   * Join multiple path segments.
   * @param paths - Path segments to join
   * @returns Promise with joined path
   */
  joinPaths(...paths: string[]): Promise<string>

  /**
   * Get the relative path from one path to another.
   * @param from - Source path
   * @param to - Target path
   * @returns Promise with relative path
   */
  getRelativePath(from: string, to: string): Promise<string>
}
