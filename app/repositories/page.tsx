import Link from "next/link"

import RepositoryList from "@/components/RepositoryList"
import { listUserAppRepositories } from "@/lib/github/repos"

export const dynamic = "force-dynamic"

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[] }
}) {
  const perPage = 30

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
  if (!appSlug) {
    throw new Error("NEXT_PUBLIC_GITHUB_APP_SLUG is not set")
  }
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`

  let allRepos: Awaited<ReturnType<typeof listUserAppRepositories>> = []
  try {
    allRepos = await listUserAppRepositories()
  } catch (error) {
    console.error("Failed to fetch app repositories:", error)
    // Render a friendly error message
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl space-y-6 font-mono text-sm">
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-red-600">
            Failed to load repositories. Please try again later.
          </p>
        </div>
      </main>
    )
  }

  const maxPage = Math.max(1, Math.ceil(allRepos.length / perPage))
  const requestedPage = Math.max(
    1,
    Number.parseInt(String(searchParams?.page ?? "1"), 10) || 1
  )
  const currentPage = Math.min(requestedPage, maxPage)
  const start = (currentPage - 1) * perPage
  const end = start + perPage
  const pageRepos = allRepos.slice(start, end)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl space-y-6 font-mono text-sm">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <RepositoryList
          repositories={pageRepos}
          currentPage={currentPage}
          maxPage={maxPage}
          username="repositories"
        />
        {installUrl && (
          <div className="pt-4">
            <Link
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800"
            >
              Manage GitHub App
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
