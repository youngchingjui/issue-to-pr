import IssueRow from "@/components/issues/IssueRow"
import TaskRow from "@/components/issues/TaskRow"
import { Table, TableBody } from "@/components/ui/table"
import { getIssueListWithStatus } from "@/lib/github/issues"
import { listTasksForRepo } from "@/lib/neo4j/services/task"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

type TableItem =
  | {
      kind: "issue"
      data: Awaited<ReturnType<typeof getIssueListWithStatus>>[number]
    }
  | { kind: "task"; data: Awaited<ReturnType<typeof listTasksForRepo>>[number] }

export default async function IssueTable({ repoFullName }: Props) {
  try {
    // Fetch GitHub issues and local tasks in parallel
    const [issues, tasks] = await Promise.all([
      getIssueListWithStatus({
        repoFullName: repoFullName.fullName,
        per_page: 25,
      }),
      listTasksForRepo(repoFullName.fullName),
    ])

    // If no items
    if (issues.length === 0 && tasks.length === 0) {
      return <p className="text-center py-4">No open issues or tasks found.</p>
    }

    // Build unified list and sort by recency (updated_at for issues, createdAt for tasks)
    const combined: TableItem[] = [
      ...issues.map((i) => ({ kind: "issue" as const, data: i })),
      ...tasks.map((t) => ({ kind: "task" as const, data: t })),
    ]

    combined.sort((a, b) => {
      const aTime =
        a.kind === "issue"
          ? new Date(a.data.updated_at).getTime()
          : new Date(a.data.createdAt).getTime()
      const bTime =
        b.kind === "issue"
          ? new Date(b.data.updated_at).getTime()
          : new Date(b.data.createdAt).getTime()
      return bTime - aTime // Descending
    })

    return (
      <div className="rounded-md border">
        <Table className="table-fixed sm:table-auto">
          <TableBody>
            {combined.map((item) =>
              item.kind === "issue" ? (
                <IssueRow
                  key={`issue-${item.data.id}`}
                  issue={item.data}
                  repoFullName={repoFullName.fullName}
                />
              ) : (
                <TaskRow key={`task-${item.data.id}`} task={item.data} />
              )
            )}
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
