import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists } from "@/lib/git"

export async function checkLocalRepo(repoFullName: string): Promise<{ exists: boolean, path: string }> {
  try {
    const dir = await getLocalRepoDir(repoFullName)
    const exists = await checkIfGitExists(dir)
    return { exists, path: dir }
  } catch (e) {
    // If there's any error, assume not exists and return unavailable path
    return { exists: false, path: "" }
  }
}
