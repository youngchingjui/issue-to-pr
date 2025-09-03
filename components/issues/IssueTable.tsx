import { Suspense } from "react"

import IssueRows from "@/components/issues/IssueRows"
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
      {/* Use auto table layout on all viewports to avoid column squeeze on mobile */}
      <Table className="table-auto">
        <TableBody>
          {/* Render GitHub issues first */}
          <Suspense fallback={<RowsSkeleton rows={5} columns={3} />}>
            <IssueRows repoFullName={repoFullName} />
          </Suspense>

          <Suspense fallback={<RowsSkeleton rows={2} columns={3} />}>
            <TaskRows repoFullName={repoFullName} />
          </Suspense>
        </TableBody>
      </Table>
    </div>
  )
}

