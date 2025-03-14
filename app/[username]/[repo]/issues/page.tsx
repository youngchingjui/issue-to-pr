import { Suspense } from "react"

import IssueTable from "@/components/issues/IssueTable"
import TableSkeleton from "@/components/layout/TableSkeleton"
import ApiKeyInput from "@/components/settings/APIKeyInput"
import { getIssueList } from "@/lib/github/issues"
import { GitHubIssue } from "@/lib/types/github"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function RepoPage({ params }: Props) {
  const { username, repo } = params
  const repoFullName = `${username}/${repo}`

  let issues: GitHubIssue[] | null = null
  let errorMessage = ""
  try {
    issues = await getIssueList({
      repoFullName,
      per_page: 100,
    })
  } catch (error) {
    console.error(error)
    issues = null
    errorMessage = (error as Error).message
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4">
          {username} / {repo} - Issues
        </h1>
        <ApiKeyInput />
      </div>
      {issues ? (
        <Suspense fallback={<TableSkeleton />}>
          <IssueTable initialIssues={issues} />
        </Suspense>
      ) : (
        <p className="text-center py-4 text-destructive">
          Error: {errorMessage || "Unable to fetch issues"}
        </p>
      )}
    </main>
  )
}
