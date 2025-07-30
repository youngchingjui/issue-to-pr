"use server"

import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists } from "@/lib/git"
import { getIssueList } from "@/lib/github/issues"
import { GitHubIssue } from "@/lib/types/github"

export async function getRepositoryIssues(
  repoFullName: string
): Promise<GitHubIssue[]> {
  return await getIssueList({ repoFullName, state: "open" })
}

export async function checkLocalRepoExists(repoFullName: string): Promise<{
  exists: boolean
  path: string
}> {
  const dir = await getLocalRepoDir(repoFullName)
  const exists = await checkIfGitExists(dir)
  return { exists, path: dir }
}
