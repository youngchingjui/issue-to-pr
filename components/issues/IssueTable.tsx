import { Suspense } from "react"

import IssueRows from "@/components/issues/IssueRows"
import TaskRows from "@/components/issues/TaskRows"
import { Table, TableBody } from "@/components/ui/table"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

// Server component – no data fetching here so it can start streaming early
export default function IssueTable({ repoFullName }: Props) {
  return (
    <div className="rounded-md border">
      <Table className="table-fixed sm:table-auto">
        <TableBody>
          {/* Render GitHub issues first – page-level Suspense already handled */}
          <IssueRows repoFullName={repoFullName} />

          {/* Tasks can be slower (Neo4j). Wrap them in their own Suspense so they
              stream in when ready without blocking the issues list. */}
          <Suspense fallback={null /* keep existing rows visible */}>
            <TaskRows repoFullName={repoFullName} />
          </Suspense>
        </TableBody>
      </Table>
    </div>
  )
}

