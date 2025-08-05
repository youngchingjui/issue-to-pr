// src/infrastructure/filesystem/local-filesystem.ts
import { getLocalRepoDir } from "@/lib/fs"
import { cleanupRepo } from "@/lib/git"

import type { FileSystemOperations } from "../../types/repository-setup"

export const createLocalFileSystem = (): FileSystemOperations => ({
  getRepoDirectory: async (repoFullName: string): Promise<string> => {
    return await getLocalRepoDir(repoFullName)
  },

  cleanup: async (path: string): Promise<void> => {
    await cleanupRepo(path)
  },
})
