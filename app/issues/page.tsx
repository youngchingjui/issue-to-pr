import { redirect } from "next/navigation"
import { Suspense } from "react"

import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { listUserRepositories } from "@/lib/github/users"

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // SSR: searchParams injected by Next.js
  // Fallback if user navigates directly to /issues (no repo)
  const repos = await listUserRepositories()

  if (repos.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Your Issues</h1>
        <div className="text-destructive">
          You have no accessible repositories. Please add or connect a GitHub
          account with repositories.
        </div>
      </div>
    )
  }

  const repoFullName = searchParams?.repo || repos[0]?.full_name
  if (!repoFullName) {
    // SSR redirect to best guess
    redirect(`/issues?repo=${encodeURIComponent(repos[0].full_name)}`)
  }

  return (
    <main className="container mx-auto py-10 max-w-4xl w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Your Issues & Workflows</h1>
        <div className="flex items-center gap-3">
          {/* Repo selector */}
          <RepoSelector repos={repos} selectedRepo={repoFullName} />
        </div>
      </div>
      {/* New issue input */}
      <div className="mb-6">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <Suspense fallback={<div>Loading issues...</div>}>
        <IssueTable repoFullName={repoFullName} />
      </Suspense>
    </main>
  )
}
