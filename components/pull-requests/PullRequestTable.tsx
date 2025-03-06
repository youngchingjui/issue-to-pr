import DataTable from "@/components/common/DataTable"
import PullRequestRow from "@/components/pull-requests/PullRequestRow"
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
    <DataTable
      title="Pull Requests"
      items={pullRequests}
      renderRow={(pr) => <PullRequestRow key={pr.id} pr={pr} />}
      emptyMessage="No pull requests found."
    />
  )
}
