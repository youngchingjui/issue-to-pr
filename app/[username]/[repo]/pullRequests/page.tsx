import { Suspense } from "react"

import PullRequestTable from "@/components/PullRequestTable"
import { TableSkeleton } from "@/components/TableSkeleton"
import { getPullRequestList } from "@/lib/github/pullRequests"
import NavigationBar from "@/components/NavigationBar"
interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function PullRequestsPage({ params }: Props) {
  const { username, repo } = params

  const pullRequests = await getPullRequestList({
    repoFullName: `${username}/${repo}`,
  })

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {username} / {repo} - Pull Requests
      </h1>
      <NavigationBar />
      <Suspense fallback={<TableSkeleton />}>
        <PullRequestTable pullRequests={pullRequests} />
      </Suspense>
    </main>
  )
}
