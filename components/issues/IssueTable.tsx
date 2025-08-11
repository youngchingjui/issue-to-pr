import { Suspense } from "react"

import IssueRows from "@/components/issues/IssueRows"
import TaskRows from "@/components/issues/TaskRows"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Table, TableBody } from "@/components/ui/table"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default function IssueTable({ repoFullName }: Props) {
  return (
    <div className="rounded-md border">
      <Table className="table-fixed sm:table-auto">
        <TableBody>
          {/* Render GitHub issues first */}
          <Suspense fallback={<TableSkeleton />}> 
            {/* issues rows */}
            {/* @ts-expect-error Async Server Component */}
            <IssueRows repoFullName={repoFullName} />
          </Suspense>

          {/* Render tasks separately; may resolve later */}
          <Suspense fallback={null}>
            {/* @ts-expect-error Async Server Component */}
            <TaskRows repoFullName={repoFullName} />
          </Suspense>
        </TableBody>
      </Table>
    </div>
  )
}

