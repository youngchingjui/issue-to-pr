"use server"

import { listUserRepositoriesGraphQL } from "@/lib/github/users";
import { listBranches } from "@/lib/github/repos";
import { getIssueList } from "@/lib/github/issues";
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
