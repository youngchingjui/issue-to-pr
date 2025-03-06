import IssueRow from "@/components/issues/IssueRow"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRepoFromString } from "@/lib/github/content"
import { getIssueList } from "@/lib/github/issues"

export default async function IssueTable({
  repoFullName,
}: {
  repoFullName: string
}) {
  try {
    const issues = await getIssueList({
      repoFullName,
      per_page: 100,
    })
    const repo = await getRepoFromString(repoFullName)

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Issues</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} repo={repo} />
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
