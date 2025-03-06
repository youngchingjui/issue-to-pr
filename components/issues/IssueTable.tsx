import DataTable from "@/components/common/DataTable"
import IssueRow from "@/components/issues/IssueRow"
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

    return (
      <DataTable
        title="Issues"
        items={issues}
        renderRow={(issue) => (
          <IssueRow key={issue.id} issue={issue} repo={repo} />
        )}
        emptyMessage="No open issues found."
      />
    )
  } catch (error) {
    return (
      <p className="text-center py-4 text-destructive">
        Error: {(error as Error).message}
      </p>
    )
  }
}
