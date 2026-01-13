export interface CreateDirectoryOptions {
  /** Whether to create parent directories recursively */
  recursive?: boolean
  /** File mode for the created directory */
  mode?: number
}

export interface WriteFileOptions {
  /** Text encoding (default: 'utf-8') */
  encoding?: string
  /** File mode for the created file */
  mode?: number
  /** Whether to create parent directories if they don't exist */
  createDirectories?: boolean
}

export interface CopyOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean
  /** Whether to preserve file permissions */
  preservePermissions?: boolean
}

export interface FSWritePort {
  /**
   * Create a directory at the specified path.
   * @param path - Path where to create the directory
   * @param options - Creation options
   * @returns Promise that resolves when directory is created
   * @throws Error if directory creation fails
   */
  createDirectory(path: string, options?: CreateDirectoryOptions): Promise<void>

  /**
   * Write content to a file.
   * @param path - Path where to write the file
   * @param content - Content to write
   * @param options - Write options
   * @returns Promise that resolves when file is written
   * @throws Error if file writing fails
   */
  writeFile(
    path: string,
    content: string,
    options?: WriteFileOptions
  ): Promise<void>

  /**
   * Write binary content to a file.
   * @param path - Path where to write the file
   * @param content - Binary content to write
   * @param options - Write options
   * @returns Promise that resolves when file is written
   * @throws Error if file writing fails
   */
  writeFileBuffer(
    path: string,
    content: Buffer,
    options?: WriteFileOptions
  ): Promise<void>

  /**
   * Append content to an existing file.
   * @param path - Path to the file
   * @param content - Content to append
   * @param options - Write options
   * @returns Promise that resolves when content is appended
   * @throws Error if append operation fails
   */
  appendFile(
    path: string,
    content: string,
    options?: WriteFileOptions
  ): Promise<void>

  /**
   * Copy a file or directory from source to destination.
   * @param source - Source path
   * @param destination - Destination path
   * @param options - Copy options
   * @returns Promise that resolves when copy is complete
   * @throws Error if copy operation fails
   */
  copy(
    source: string,
    destination: string,
    options?: CopyOptions
  ): Promise<void>

  /**
   * Move/rename a file or directory.
   * @param source - Source path
   * @param destination - Destination path
   * @returns Promise that resolves when move is complete
   * @throws Error if move operation fails
   */
  move(source: string, destination: string): Promise<void>

  /**
   * Delete a file.
   * @param path - Path to the file to delete
   * @returns Promise that resolves when file is deleted
   * @throws Error if deletion fails
   */
  deleteFile(path: string): Promise<void>

  /**
   * Delete a directory and all its contents recursively.
   * @param path - Path to the directory to delete
   * @returns Promise that resolves when directory is deleted
   * @throws Error if deletion fails
   */
  deleteDirectory(path: string): Promise<void>

  /**
   * Remove a file or directory (alias for deleteFile/deleteDirectory).
   * @param path - Path to remove
   * @returns Promise that resolves when removal is complete
   * @throws Error if removal fails
   */
  remove(path: string): Promise<void>

  /**
   * Create a symbolic link.
   * @param target - Path that the link points to
   * @param linkPath - Path where to create the link
   * @returns Promise that resolves when link is created
   * @throws Error if link creation fails
   */
  createSymlink(target: string, linkPath: string): Promise<void>

  /**
   * Change file or directory permissions.
   * @param path - Path to change permissions for
   * @param mode - New permission mode
   * @returns Promise that resolves when permissions are changed
   * @throws Error if permission change fails
   */
  changePermissions(path: string, mode: number): Promise<void>

  /**
   * Create a temporary directory with a unique name.
   * @param prefix - Optional prefix for the directory name
   * @returns Promise with the path to the created temporary directory
   * @throws Error if temporary directory creation fails
   */
  createTempDirectory(prefix?: string): Promise<string>

  /**
   * Create a temporary file with a unique name.
   * @param prefix - Optional prefix for the file name
   * @param suffix - Optional suffix for the file name
   * @returns Promise with the path to the created temporary file
   * @throws Error if temporary file creation fails
   */
  createTempFile(prefix?: string, suffix?: string): Promise<string>
}
