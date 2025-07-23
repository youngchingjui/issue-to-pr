"use client"

import { useEffect } from "react"
import useSWR from "swr"

import IssueRow from "@/components/issues/IssueRow"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Table, TableBody } from "@/components/ui/table"
import type { IssueWithStatus } from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
  /**
   * Optional value that, when changed, will trigger a revalidation of the
   * issues list. Parents can update this value (e.g. Date.now()) to instruct
   * the table to refresh its data without requiring a full page reload.
   */
  refreshSignal?: unknown
  /**
   * Number of issues to fetch per page (default 25)
   */
  perPage?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function IssueTableClient({
  repoFullName,
  refreshSignal,
  perPage = 25,
}: Props) {
  const apiUrl = `/api/issues?repo=${encodeURIComponent(
    repoFullName.fullName
  )}&per_page=${perPage}`

  const {
    data: issues,
    isLoading,
    error,
    mutate,
  } = useSWR<IssueWithStatus[]>(apiUrl, fetcher)

  // Revalidate when the refreshSignal changes.
  useEffect(() => {
    if (refreshSignal !== undefined) {
      void mutate()
    }
  }, [refreshSignal, mutate])

  if (isLoading) {
    return <TableSkeleton />
  }

  if (error) {
    return (
      <p className="text-center py-4 text-destructive">
        Error: {error instanceof Error ? error.message : String(error)}
      </p>
    )
  }

  if (!issues || issues.length === 0) {
    return <p className="text-center py-4">No open issues found.</p>
  }

  return (
    <div className="rounded-md border">
      <Table className="table-fixed sm:table-auto">
        <TableBody>
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              repoFullName={repoFullName.fullName}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
