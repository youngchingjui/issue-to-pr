"use client"

import IssueRow from "@/components/issues/IssueRow"
import { Table, TableBody } from "@/components/ui/table"
import { RepoFullName } from "@/lib/types/github"

import { useIssueList } from "./IssueListProvider"

interface Props {
  repoFullName: RepoFullName
}

export default function IssueTable({ repoFullName }: Props) {
  const { issues, loading, error } = useIssueList()

  if (loading) {
    return <p className="text-center py-4">Loading issues...</p>
  }

  if (error) {
    return (
      <p className="text-center py-4 text-destructive">Error: {error}</p>
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

