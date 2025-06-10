import { Suspense } from "react"

import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import TableSkeleton from "@/components/layout/TableSkeleton"
import ApiKeyInput from "@/components/settings/APIKeyInput"
import { repoFullNameSchema } from "@/lib/types/github"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function RepoPage({ params }: Props) {
  const { username, repo } = params

  const repoFullName = repoFullNameSchema.parse(`${username}/${repo}`)
  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4">
          {username} / {repo} - Issues
        </h1>
        <ApiKeyInput />
      </div>
      <NewTaskInput repoFullName={repoFullName} />
      <Suspense fallback={<TableSkeleton />}>
        <IssueTable repoFullName={repoFullName} />
      </Suspense>
    </main>
  )
}
