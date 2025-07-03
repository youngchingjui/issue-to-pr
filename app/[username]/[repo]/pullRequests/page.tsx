import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
import PullRequestTable from "@/components/pull-requests/PullRequestTable"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function PullRequestsPage({ params }: Props) {
  const { username, repo } = params

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">
          {username} / {repo} - Pull Requests
        </h1>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <PullRequestTable username={username} repoName={repo} />
      </Suspense>
    </main>
  )
}
