import { redirect } from "next/navigation"

import { auth } from "@/auth"
import RepositoryList from "@/components/RepositoryList"

async function getRepositories(accessToken: string, page = 1, perPage = 30) {
  const res = await fetch(
    `https://api.github.com/user/repos?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const linkHeader = res.headers.get("link")
  const lastPageMatch = linkHeader?.match(
    /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/
  )
  const maxPage = lastPageMatch ? Number(lastPageMatch[1]) : page
  const repositories = await res.json()
  return { repositories, currentPage: page, maxPage }
}

export default async function Home({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { page: string }
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const accessToken = session.user.accessToken
  if (!accessToken) {
    redirect("/api/auth/signin")
  }

  const page = Number(searchParams.page) || 1
  const { repositories, currentPage, maxPage } = await getRepositories(
    accessToken,
    page
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Select a Repository</h1>
        <RepositoryList
          repositories={repositories}
          currentPage={currentPage}
          maxPage={maxPage}
        />
      </div>
    </main>
  )
}
