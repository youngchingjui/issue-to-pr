import Link from "next/link"

import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { Button } from "@/components/ui/button"
import { listUserAppRepositories } from "@/lib/github/repos"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssueDashboard() {
  const repos = await listUserAppRepositories()
  const firstRepo = repos[0]
  if (!firstRepo) {
    if (!process.env.NEXT_PUBLIC_GITHUB_APP_SLUG) {
      console.error(
        "NEXT_PUBLIC_GITHUB_APP_SLUG is not set. Please set it in your environment variables."
      )
      return (
        <div className="container mx-auto py-10">
          <h1 className="text-2xl font-bold mb-6">Your Issues</h1>
          <div className="text-destructive">
            GitHub App slug is not configured. Please set
            NEXT_PUBLIC_GITHUB_APP_SLUG.
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Welcome</h1>
        <Button asChild>
          <Link
            href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Connect your GitHub repository to get started
          </Link>
        </Button>
      </div>
    )
  }

  const repoFullName = repoFullNameSchema.parse(firstRepo.full_name)

  return (
    <main className="container mx-auto py-10 max-w-4xl w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector selectedRepo={repoFullName.fullName} />
        </div>
      </div>
      <div className="mb-8">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <IssueTable repoFullName={repoFullName} />
    </main>
  )
}
