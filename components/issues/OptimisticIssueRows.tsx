"use client"

import IssueRow from "@/components/issues/IssueRow"
import { useOptimisticIssues } from "@/components/issues/OptimisticIssuesProvider"

interface Props {
  repoFullName: string
  existingIssueNumbers: number[]
}

export default function OptimisticIssueRows({
  repoFullName,
  existingIssueNumbers,
}: Props) {
  const { optimisticIssues } = useOptimisticIssues()
  if (optimisticIssues.length === 0) return null

  const existingSet = new Set(existingIssueNumbers)
  const visibleIssues = optimisticIssues.filter(
    (issue) => !existingSet.has(issue.number)
  )

  if (visibleIssues.length === 0) return null

  return (
    <>
      {visibleIssues.map((issue) => (
        <IssueRow
          key={`optimistic-issue-${issue.number}`}
          issue={issue}
          repoFullName={repoFullName}
        />
      ))}
    </>
  )
}
