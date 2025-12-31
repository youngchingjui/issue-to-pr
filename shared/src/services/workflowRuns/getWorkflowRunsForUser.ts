import type { DatabaseStorage, ListedWorkflowRun } from "@/shared/ports/db"

export interface GetWorkflowRunsForUserParams {
  userId: string
}

/**
 * Business logic: Get workflow runs visible to a user.
 *
 * CURRENT IMPLEMENTATION:
 * - Returns runs initiated by the user
 * - Repository nodes now exist in Neo4j with proper relationships
 * - Infrastructure ready to expand to include repo-owned runs
 *
 * EXPANSION READY:
 * The adapter layer supports querying by repository. To include webhook-initiated
 * runs on user's repositories, add:
 * 1. Fetch user's repository list (from GitHub API or cached in Neo4j)
 * 2. Call storage.runs.list({ by: "repository", repo: {...} }) for each
 * 3. Combine with initiated runs and deduplicate
 *
 * OWNERSHIP CONSIDERATIONS (when expanding):
 * - Repository owner inferred from repo.owner property (stored in Neo4j)
 * - Consider GitHub complexities: orgs, forks, permissions, collaborators
 * - User expectations: personal repos vs org repos vs repos with write access?
 * - May need GithubUser nodes and ownership relationships for precise control
 *
 * Results are deduplicated by workflow run ID and sorted by creation date.
 */
export async function getWorkflowRunsForUser(
  storage: DatabaseStorage,
  params: GetWorkflowRunsForUserParams
): Promise<ListedWorkflowRun[]> {
  const { userId } = params

  // Fetch runs initiated by the user
  const initiatedRuns = await storage.runs.list({
    by: "initiator",
    user: { id: userId },
  })

  // TODO: Expand to include runs on repositories owned by the user:
  // const userRepos = await getUserRepositories(userId) // from GitHub API or Neo4j
  // const repoRunsPromises = userRepos.map(repo =>
  //   storage.runs.list({ by: "repository", repo: { fullName: repo.fullName, id: repo.id } })
  // )
  // const repoRuns = (await Promise.all(repoRunsPromises)).flat()
  // const allRuns = [...initiatedRuns, ...repoRuns]

  const uniqueRuns = deduplicateByRunId(initiatedRuns)

  // Sort by creation date, most recent first
  return uniqueRuns.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function deduplicateByRunId(runs: ListedWorkflowRun[]): ListedWorkflowRun[] {
  const seen = new Map<string, ListedWorkflowRun>()

  for (const run of runs) {
    if (!seen.has(run.id)) {
      seen.set(run.id, run)
    }
  }

  return Array.from(seen.values())
}
