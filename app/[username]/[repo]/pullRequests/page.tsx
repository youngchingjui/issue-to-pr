import Link from "next/link"
import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
import PullRequestTable from "@/components/pull-requests/PullRequestTable"
import ApiKeyInput from "@/components/settings/APIKeyInput"
import { Button } from "@/components/ui/button"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function PullRequestsPage({ params }: Props) {
  const { username, repo } = params

  const apiKey = await getUserOpenAIApiKey()

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">
          {username} / {repo} - Pull Requests
        </h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${username}/${repo}/settings`}>Settings</Link>
          </Button>
          <ApiKeyInput initialKey={apiKey ?? ""} />
        </div>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <PullRequestTable username={username} repoName={repo} />
      </Suspense>
    </main>
  )
}
