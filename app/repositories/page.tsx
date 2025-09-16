import Link from "next/link"

import RepositoryList from "@/components/RepositoryList"
import { listUserAppRepositories } from "@/lib/github/repos"

export const dynamic = "force-dynamic"

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Number(searchParams?.page) || 1
  const perPage = 30

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null

  const allRepos = await listUserAppRepositories()
  const maxPage = Math.max(1, Math.ceil(allRepos.length / perPage))
  const start = (page - 1) * perPage
  const end = start + perPage
  const pageRepos = allRepos.slice(start, end)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl space-y-6 font-mono text-sm">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <RepositoryList
          repositories={pageRepos}
          currentPage={page}
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
