import PullRequestRow from "@/components/pull-requests/PullRequestRow"
import DataTable from "@/components/common/DataTable"
import { TableRow, TableHead } from "@/components/ui/table"
import { getPullRequestList } from "@/lib/github/pullRequests"

export default async function PullRequestTable({
  username,
  repoName,
}: {
  username: string
  repoName: string
}) {
  const pullRequests = await getPullRequestList({
    repoFullName: `${username}/${repoName}`,
  })

  const header = (
    <TableRow>
      <TableHead className="w-full">Title</TableHead>
      <TableHead className="w-12 text-center">Status</TableHead>
      <TableHead className="w-[150px] text-right">Actions</TableHead>
    </TableRow>
  )

  return (
    <DataTable header={header} emptyMessage="No pull requests found.">
      {pullRequests.map((pr) => (
        <PullRequestRow key={pr.id} pr={pr} />
      ))}
    </DataTable>
  )
}
