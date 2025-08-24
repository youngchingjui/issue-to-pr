import type {
  GitHubIssuesPort,
  IssueRef,
  IssueTitleResult,
} from "@/shared/src/core/ports/github"

/**
 * Service-level function to fetch issue titles using a provided GitHub port.
 * Keeps clean architecture by only depending on the port interface.
 */
export async function fetchIssueTitles(
  port: GitHubIssuesPort,
  refs: IssueRef[]
): Promise<IssueTitleResult[]> {
  // Deduplicate identical refs to avoid redundant API calls
  const keyFor = (r: IssueRef) => `${r.repoFullName}#${r.number}`
  const uniqMap = new Map<string, IssueRef>()
  refs.forEach((r) => uniqMap.set(keyFor(r), r))

  const uniqueRefs = Array.from(uniqMap.values())
  const results = await port.getIssueTitles(uniqueRefs)

  // Map results back to input order with a lookup for O(1)
  const byKey = new Map(results.map((r) => [keyFor(r), r]))
  return refs.map(
    (r) =>
      byKey.get(keyFor(r)) ?? {
        repoFullName: r.repoFullName,
        number: r.number,
        title: null,
      }
  )
}

export default fetchIssueTitles
