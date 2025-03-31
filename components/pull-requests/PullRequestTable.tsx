import DataTable from "@/components/common/DataTable"
import PullRequestRow from "@/components/pull-requests/PullRequestRow"
import { getPullRequestList } from "@/lib/github/pullRequests"

export default async function PullRequestTable({
  login,
  repoName,
}: {
  login: string
  repoName: string
}) {
  const pullRequests = await getPullRequestList({
    repoFullName: `${login}/${repoName}`,
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
