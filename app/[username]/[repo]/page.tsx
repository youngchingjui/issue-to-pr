import { Suspense } from "react"

import ApiKeyInput from "@/components/APIKeyInput"
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4">
          {username} / {repo}
        </h1>
        <ApiKeyInput />
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <IssueTable username={username} repoName={repo} />
      </Suspense>
    </main>
  )
}
