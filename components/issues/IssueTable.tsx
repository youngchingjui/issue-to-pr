import { Suspense } from "react"

import IssueRows from "@/components/issues/IssueRows"
import LoadMoreIssues from "@/components/issues/LoadMoreIssues"
import OptimisticIssueRows from "@/components/issues/OptimisticIssueRows"
import RowsSkeleton from "@/components/issues/RowsSkeleton"
import TaskRows from "@/components/issues/TaskRows"
import { Table, TableBody } from "@/components/ui/table"
import {
  getIssueListWithStatus,
  getLinkedPRNumbersForIssues,
} from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default async function IssueTable({ repoFullName }: Props) {
  const issues = await getIssueListWithStatus({
    repoFullName: repoFullName.fullName,
    per_page: 25,
  })

  const issueNumbers = issues.map((i) => i.number)
  const prMap =
    issueNumbers.length > 0
      ? await getLinkedPRNumbersForIssues({
          repoFullName: repoFullName.fullName,
          issueNumbers,
        })
      : {}

  return (
    <div className="rounded-md border">
      <Table className="table-auto">
        <TableBody>
          <OptimisticIssueRows
            repoFullName={repoFullName.fullName}
            existingIssueNumbers={issueNumbers}
          />

          {/* Render GitHub issues first */}
          <IssueRows
            repoFullName={repoFullName.fullName}
            issues={issues}
            prMap={prMap}
          />

          {/* Load more button and dynamically loaded issues */}
          <LoadMoreIssues repoFullName={repoFullName.fullName} />

          <Suspense fallback={<RowsSkeleton rows={2} columns={3} />}>
            <TaskRows repoFullName={repoFullName} />
          </Suspense>
        </TableBody>
      </Table>
    </div>
  )
}
