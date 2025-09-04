"use server"

import {
  getIssueListWithStatus,
  getLinkedPRNumbersForIssues,
} from "@/lib/github/issues"

import {
  type ListIssuesInput,
  listIssuesInputSchema,
  type ListIssuesResult,
} from "./schemas"

// Overload for typed usage
export async function listIssues(
  input: ListIssuesInput
): Promise<ListIssuesResult>
// Accept unknown at boundary and validate
export async function listIssues(input: unknown): Promise<ListIssuesResult>
export async function listIssues(input: unknown): Promise<ListIssuesResult> {
  const {
    repoFullName,
    page = 1,
    per_page = 25,
  } = listIssuesInputSchema.parse(input)

  const issues = await getIssueListWithStatus({
    repoFullName,
    page,
    per_page,
  })

  const issueNumbers = issues.map((i) => i.number)
  const prMap =
    issueNumbers.length > 0
      ? await getLinkedPRNumbersForIssues({
          repoFullName,
          issueNumbers,
        })
      : {}

  const hasMore = issues.length === per_page

  return { issues, prMap, hasMore }
}
