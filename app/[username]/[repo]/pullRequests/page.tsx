import { Suspense } from "react"

import NavigationBar from "@/components/NavigationBar"
import PullRequestTable from "@/components/PullRequestTable"
import { TableSkeleton } from "@/components/TableSkeleton"

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
      <h1 className="text-2xl font-bold mb-4">
        {username} / {repo} - Pull Requests
      </h1>
      <NavigationBar
        currentPage="pullRequests"
        username={username}
        repo={repo}
      />
      <Suspense fallback={<TableSkeleton />}>
        <PullRequestTable username={username} repoName={repo} />
      </Suspense>
    </main>
  )
}
