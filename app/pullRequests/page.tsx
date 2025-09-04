import { redirect } from "next/navigation"

import NoRepoCTA from "@/components/common/NoRepoCTA"
import PullRequestTable from "@/components/pull-requests/PullRequestTable"
import { listUserAppRepositories } from "@/lib/github/repos"
import { AuthenticatedUserRepository, repoFullNameSchema } from "@/lib/types/github"

export default async function PullRequestsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const repoFullNameParseResult = repoFullNameSchema.safeParse(searchParams?.repo)

  let repos: AuthenticatedUserRepository[] | undefined
  if (!repoFullNameParseResult.success) {
    repos = await listUserAppRepositories()
    const firstRepo = repos.length > 0 ? repos[0] : null

    if (!firstRepo) return <NoRepoCTA />

    return redirect(`/pullRequests?repo=${encodeURIComponent(firstRepo.full_name)}`)
  }

  if (!repos) {
    repos = await listUserAppRepositories()
  }

  const { owner: username, repo: repoName } = repoFullNameParseResult.data

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">{username} / {repoName} - Pull Requests</h1>
      </div>
      <PullRequestTable username={username} repoName={repoName} />
    </main>
  )
}

