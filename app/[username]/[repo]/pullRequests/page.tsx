import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
import PullRequestTable from "@/components/pull-requests/PullRequestTable"

interface Props {
  params: {
    login: string
    repo: string
  }
}

export default async function PullRequestsPage({ params }: Props) {
  const { login, repo } = params

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {login} / {repo} - Pull Requests
      </h1>
      <Suspense fallback={<TableSkeleton />}>
        <PullRequestTable login={login} repoName={repo} />
      </Suspense>
    </main>
  )
}
