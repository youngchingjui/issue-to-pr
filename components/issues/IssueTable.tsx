import IssueRow from "@/components/issues/IssueRow"
import DataTable from "@/components/common/DataTable"
import { TableRow, TableHead } from "@/components/ui/table"
import { getIssueListWithStatus } from "@/lib/github/issues"

export default async function IssueTable({
  repoFullName,
}: {
  repoFullName: string
}) {
  try {
    const issues = await getIssueListWithStatus({
      repoFullName,
      per_page: 100,
    })

    const header = (
      <TableRow>
        <TableHead className="w-full">Title</TableHead>
        <TableHead className="w-12 text-center">Status</TableHead>
        <TableHead className="w-[150px] text-right">Actions</TableHead>
      </TableRow>
    )

    return (
      <DataTable header={header} emptyMessage="No open issues found.">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} repoFullName={repoFullName} />
        ))}
      </DataTable>
    )
  } catch (error) {
    return (
      <p className="text-center py-4 text-destructive">
        Error: {(error as Error).message}
      </p>
    )
  }
}
