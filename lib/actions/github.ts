"use server"

import { listUserRepositoriesGraphQL } from "@/lib/github/users";
import { listBranches } from "@/lib/github/repos";
import { getIssueList } from "@/lib/github/issues";
import { getLocalRepoDir } from "@/lib/fs";
import { checkIfGitExists } from "@/lib/git";
import { RepoSelectorItem, GitHubIssue } from "@/lib/types/github";

export async function getUserRepositories(): Promise<RepoSelectorItem[]> {
  return await listUserRepositoriesGraphQL();
}

export async function getRepositoryBranches(repoFullName: string): Promise<string[]> {
  return await listBranches(repoFullName);
}

export async function getRepositoryIssues(repoFullName: string): Promise<GitHubIssue[]> {
  return await getIssueList({ repoFullName, state: "open" });
}

export async function checkLocalRepoExists(repoFullName: string): Promise<{
  exists: boolean;
  path: string;
}> {
  const dir = await getLocalRepoDir(repoFullName);
  const exists = await checkIfGitExists(dir);
  return { exists, path: dir };
}
