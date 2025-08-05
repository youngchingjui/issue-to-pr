// src-oop/infrastructure/filesystem/LocalFileSystemService.ts
import { getLocalRepoDir } from "@/lib/fs"
import { cleanupRepo } from "@/lib/git"
import { IFileSystemService } from "../../types/repository-setup"

export class LocalFileSystemService implements IFileSystemService {
  async getRepoDirectory(repoFullName: string): Promise<string> {
    return await getLocalRepoDir(repoFullName)
  }

  async cleanupDirectory(path: string): Promise<void> {
    await cleanupRepo(path)
  }
}
