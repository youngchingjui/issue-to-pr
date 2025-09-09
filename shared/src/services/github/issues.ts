import type {
  IssueReaderPort,
  IssueRef,
  IssueTitleResult,
} from "@shared/ports/github/issue.reader"
import {
  type CreateIssueInput,
  IssueWriterPort,
} from "@shared/ports/github/issue.writer"

/**
 * Service-level function to fetch issue titles using a provided GitHub port.
 * Keeps clean architecture by only depending on the port interface.
 */
export async function fetchIssueTitles(
  port: IssueReaderPort,
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

export async function createIssueForRepo(
  port: IssueWriterPort,
  input: CreateIssueInput
) {
  const sanitized = {
    ...input,
    title: input.title.trim(),
    body: input.body?.trim() ?? undefined,
  }
  return port.createIssue(sanitized)
}
