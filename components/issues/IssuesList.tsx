"use client"

import IssueRow from "@/components/issues/IssueRow"
import PRStatusIndicator from "@/components/issues/PRStatusIndicator"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  repoFullName: string
  issues: IssueWithStatus[]
  prMap: Record<number, number | null>
  loading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
}

export default function IssuesList({
  repoFullName,
  issues,
  prMap,
  loading,
  error,
  hasMore,
  onLoadMore,
}: Props) {
  return (
    <>
      {issues.map((issue) => (
        <IssueRow
          key={`issue-${issue.id}`}
          issue={issue}
          repoFullName={repoFullName}
          prSlot={
            <PRStatusIndicator
              repoFullName={repoFullName}
              prNumber={prMap[issue.number]}
            />
          }
        />
      ))}

      {error && (
        <TableRow>
          <TableCell colSpan={3} className="text-red-600">
            {error}
          </TableCell>
        </TableRow>
      )}

      {hasMore && (
        <TableRow>
          <TableCell colSpan={3} className="text-center py-4">
            <Button onClick={onLoadMore} disabled={loading} variant="outline">
              {loading ? "Loading..." : "Load more"}
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
