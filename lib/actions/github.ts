"use server"

import { makeAppInstallationReposReaderAdapter } from "shared/adapters/github/octokit/rest/appInstallation.repositories.reader"
import { makeAccessTokenProviderFrom } from "shared/providers/auth"
import { withTiming } from "shared/utils/telemetry"

import { auth } from "@/auth"
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

/**
 * Returns the list of repository full names (owner/repo) that the current
 * user can access AND that have our GitHub App installed for that user.
 * This server action is implemented via the shared ports/adapters layer.
 */
export async function listUserAppRepositoryNames(): Promise<string[]> {
  const accessTokenProvider = makeAccessTokenProviderFrom(
    auth,
    (s) => s?.token?.access_token as unknown as string | null | undefined
  )

  const token = await accessTokenProvider()
  const adapter = makeAppInstallationReposReaderAdapter({ token })

  const result = await withTiming("GitHub: listUserAppRepositoryNames", () =>
    adapter.listUserAccessibleRepoFullNames()
  )

  if (!result.ok) {
    // On auth errors we return an empty list for UX instead of throwing
    if (result.error === "AuthRequired") return []
    return []
  }

  return result.value
}
