import RepositoryList from "@/components/RepositoryList"
import { getUserRepositories } from "@/lib/github/content"

export default async function Repositories({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { page: string }
}) {
  const page = Number(searchParams.page) || 1

  const { repositories, maxPage } = await getUserRepositories(params.username, {
    per_page: 30,
    page,
    sort: "updated",
    direction: "desc",
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Select a Repository</h1>
        <RepositoryList
          repositories={repositories}
          currentPage={page}
          maxPage={maxPage}
          username={params.username}
        />
      </div>
    </main>
  )
}
