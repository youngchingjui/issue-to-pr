import { Suspense } from "react"

import IssueRows from "@/components/issues/IssueRows"
import LoadMoreIssues from "@/components/issues/LoadMoreIssues"
import RowsSkeleton from "@/components/issues/RowsSkeleton"
import TaskRows from "@/components/issues/TaskRows"
import { Table, TableBody } from "@/components/ui/table"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default async function IssueTable({ repoFullName }: Props) {
  return (
    <div className="rounded-md border">
      <Table className="table-fixed sm:table-auto">
        <TableBody>
          {/* Render GitHub issues first */}
          <Suspense fallback={<RowsSkeleton rows={5} columns={3} />}>
            <IssueRows repoFullName={repoFullName} />
          </Suspense>

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

