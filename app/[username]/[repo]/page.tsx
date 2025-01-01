import { Suspense } from "react"

import IssueTable from "@/components/IssueTable"
import { TableSkeleton } from "@/components/TableSkeleton"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function RepoPage({ params }: Props) {
  const { username, repo } = params

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {username} / {repo}
      </h1>
      <Suspense fallback={<TableSkeleton />}>
        <IssueTable username={username} repo={repo} />
      </Suspense>
    </main>
  )
}
