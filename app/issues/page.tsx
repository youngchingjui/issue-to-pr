import { redirect } from "next/navigation"
import { Suspense } from "react"

import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { listUserRepositories } from "@/lib/github/users"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // SSR: searchParams injected by Next.js
  const repoFullNameParseResult = repoFullNameSchema.safeParse(
    searchParams?.repo
  )
  if (!repoFullNameParseResult.success) {
    // Only fetch repos if we need to redirect
    const repos = await listUserRepositories()
    const firstRepo = repos[0]
    if (!firstRepo) {
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
    const repoFullName = firstRepo.nameWithOwner
    if (!repoFullName) {
      redirect(`/issues?repo=${encodeURIComponent(firstRepo.nameWithOwner)}`)
    } else {
      redirect(`/issues?repo=${encodeURIComponent(repoFullName)}`)
    }
  }

  const repoFullName = repoFullNameParseResult.data
  return (
    <main className="container mx-auto py-10 max-w-4xl w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Your Issues & Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector selectedRepo={repoFullName.fullName} />
        </div>
      </div>
      <div className="mb-6">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <Suspense fallback={<div>Loading issues...</div>}>
        <IssueTable repoFullName={repoFullName} />
      </Suspense>
    </main>
  )
}
