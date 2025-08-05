// src/infrastructure/git/git-operations.ts
import {
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
  ensureValidRepo,
  setRemoteOrigin,
} from "@/lib/git"

import type { GitOperations } from "../../types/repository-setup"

export const createGitOperations = (): GitOperations => ({
  ensureValidRepo: async (path: string, cloneUrl: string): Promise<void> => {
    await ensureValidRepo(path, cloneUrl)
  },

  setRemoteOrigin: async (path: string, url: string): Promise<void> => {
    await setRemoteOrigin(path, url)
  },

  cleanCheckout: async (branch: string, path: string): Promise<void> => {
    await cleanCheckout(branch, path)
  },

  cleanup: async (path: string): Promise<void> => {
    await cleanupRepo(path)
  },

  clone: async (cloneUrl: string, path: string): Promise<void> => {
    await cloneRepo(cloneUrl, path)
  },
})
