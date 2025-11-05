import DataTable from "@/components/common/DataTable"
import PullRequestRow from "@/components/pull-requests/PullRequestRow"
import { getPullRequestListWithExtras } from "@/lib/github/pullRequests"

export default async function PullRequestTable({
  username,
  repoName,
}: {
  username: string
  repoName: string
}) {
  const repoFullName = `${username}/${repoName}`
  const pullRequests = await getPullRequestListWithExtras({
    repoFullName,
  })

  return (
    <DataTable
      title="Pull Requests"
      items={pullRequests}
      renderRow={(item) => (
        <PullRequestRow
          key={item.pr.id}
          pr={item.pr}
          previewUrl={item.extras.previewUrl || undefined}
          linkedIssues={item.extras.linkedIssues}
        />
      )}
      emptyMessage="No pull requests found."
    />
  )
}

