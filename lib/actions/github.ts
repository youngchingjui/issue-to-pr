"use server"

import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists } from "@/lib/git"
import { getIssueList } from "@/lib/github/issues"
import { listBranchInfo } from "@/lib/github/repos"
import { listUserRepositoriesGraphQL } from "@/lib/github/users"
import { GitHubIssue, RepoSelectorItem } from "@/lib/types/github"

export async function getUserRepositories(): Promise<RepoSelectorItem[]> {
  return await listUserRepositoriesGraphQL()
}

export async function getRepositoryBranches(
  repoFullName: string,
  limit = 25,
  page = 1
): Promise<string[]> {
  const start = (page - 1) * limit
  const end = start + limit
  const info = await listBranchInfo(repoFullName, 100) // GitHub limit
  return info.slice(start, end).map((b) => b.name)
}

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
