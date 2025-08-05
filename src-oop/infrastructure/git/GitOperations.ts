// src-oop/infrastructure/git/GitOperations.ts
import {
  ensureValidRepo,
  setRemoteOrigin,
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
} from "@/lib/git"
import { IGitOperations } from "../../types/repository-setup"

export class GitOperations implements IGitOperations {
  async ensureValidRepo(path: string, cloneUrl: string): Promise<void> {
    await ensureValidRepo(path, cloneUrl)
  }

  async setRemoteOrigin(path: string, url: string): Promise<void> {
    await setRemoteOrigin(path, url)
  }

  async cleanCheckout(branch: string, path: string): Promise<void> {
    await cleanCheckout(branch, path)
  }

  async cleanup(path: string): Promise<void> {
    await cleanupRepo(path)
  }

  async clone(cloneUrl: string, path: string): Promise<void> {
    await cloneRepo(cloneUrl, path)
  }
}
