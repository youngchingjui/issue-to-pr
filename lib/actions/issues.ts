"use server"

import { z } from "zod"

import {
  getIssueListWithStatus,
  getLinkedPRNumbersForIssues,
} from "@/lib/github/issues"

// Input schema for listIssues server action. Accept unknown and validate with Zod.
export const listIssuesInputSchema = z.object({
  repoFullName: z.string().min(3),
  page: z.number().int().min(1).default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(25).optional(),
})
export type ListIssuesInput = z.infer<typeof listIssuesInputSchema>

const listIssuesResultSchema = z.object({
  issues: z.array(z.any()),
  prMap: z.record(z.number(), z.number().nullable()),
  hasMore: z.boolean(),
})
export type ListIssuesResult = z.infer<typeof listIssuesResultSchema>

// Overload for typed usage
export async function listIssues(input: ListIssuesInput): Promise<ListIssuesResult>
// Accept unknown at boundary and validate
export async function listIssues(input: unknown): Promise<ListIssuesResult>
export async function listIssues(input: unknown): Promise<ListIssuesResult> {
  const { repoFullName, page = 1, per_page = 25 } = listIssuesInputSchema.parse(
    input
  )

  const issues = await getIssueListWithStatus({
    repoFullName,
    page,
    per_page,
  })

  const issueNumbers = issues.map((i) => i.number)
  const prMap = await getLinkedPRNumbersForIssues({
    repoFullName,
    issueNumbers,
  })

  const hasMore = issues.length === per_page

  return { issues, prMap, hasMore }
}

