import { PullRequestRow } from "@/components/PullRequestRow"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PR #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pullRequests.map((pr) => (
            <PullRequestRow key={pr.id} pr={pr} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
