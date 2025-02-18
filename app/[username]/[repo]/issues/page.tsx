import { Suspense } from "react"

import ApiKeyInput from "@/components/APIKeyInput"
import IssueTable from "@/components/IssueTable"
import NavigationBar from "@/components/NavigationBar"
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
          {username} / {repo} - Issues
        </h1>
        <ApiKeyInput />
      </div>
      <NavigationBar currentPage="issues" username={username} repo={repo} />
      <Suspense fallback={<TableSkeleton />}>
        <IssueTable repoFullName={username + "/" + repo} />
      </Suspense>
    </main>
  )
}
