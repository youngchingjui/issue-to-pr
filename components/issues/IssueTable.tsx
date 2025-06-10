import IssueRow from "@/components/issues/IssueRow"
import { Table, TableBody } from "@/components/ui/table"
import { getIssueListWithStatus } from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default async function IssueTable({ repoFullName }: Props) {
  try {
    const issues = await getIssueListWithStatus({
      repoFullName: repoFullName.fullName,
      per_page: 100,
    })

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <div className="rounded-md border">
        <Table>
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
  } catch (error) {
    return (
      <p className="text-center py-4 text-destructive">
        Error: {(error as Error).message}
      </p>
    )
  }
}
