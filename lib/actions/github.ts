"use server"

import { auth } from "@/auth"
import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists } from "@/lib/git"
import { getIssueList } from "@/lib/github/issues"
import { GitHubIssue } from "@/lib/types/github"
import { makeRepositoryReaderAdapter } from "@/shared/adapters/github/octokit/rest/repository.reader"
import { withTiming } from "@/shared/utils/telemetry"

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
 *
 * TODO: This doesn't exactly follow clean code architecture principles. We should probably be calling a port or adapter.
 * This server action would also act as an orchestrator and be responsible for injecting the adapters.
 */
export async function listUserAppRepositoryNames(): Promise<string[]> {
  const session = await auth()
  if (!session?.token?.access_token) {
    return []
  }
  const adapter = makeRepositoryReaderAdapter({
    token: session.token.access_token,
  })

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
