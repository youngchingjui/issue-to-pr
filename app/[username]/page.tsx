import Image from "next/image"
import Link from "next/link"

import RepositoryList from "@/components/RepositoryList"
import { getUserOctokit } from "@/lib/github"
import { GitHubError } from "@/lib/github/content"
import { listUserOwnedAndAppInstalledRepositories } from "@/lib/github/repos"
import { getGithubUser } from "@/lib/github/users"
import { AuthenticatedUserRepository } from "@/lib/types/github"

export const dynamic = "force-dynamic"

export default async function Repositories({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams?: { page?: string | string[] }
}) {
  const perPage = 30

  // Build GitHub App installation URL; fail fast if missing
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
  if (!appSlug) {
    throw new Error("NEXT_PUBLIC_GITHUB_APP_SLUG is not set")
  }
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`

  // Parse and clamp page request
  const requestedPage = Math.max(
    1,
    Number.parseInt(String(searchParams?.page ?? "1"), 10) || 1
  )

  try {
    // Basic profile info for the target username
    let profile: { avatar_url?: string; name?: string; login?: string } | null =
      null
    try {
      const octokit = await getUserOctokit()
      const { data } = await octokit.rest.users.getByUsername({
        username: params.username,
      })
      profile = {
        avatar_url: data.avatar_url,
        name: data.name ?? undefined,
        login: data.login,
      }
    } catch (e) {
      // Non-fatal: keep profile null on errors
      console.warn(`Failed to fetch profile for ${params.username}:`, e)
      profile = null
    }

    // Determine if viewing own profile
    const authUser = await getGithubUser()
    let repositories: AuthenticatedUserRepository[] = []

    // Always compute combined list for the target username
    // UNION(owned by username, app-installed owned by username)
    repositories = await listUserOwnedAndAppInstalledRepositories(
      params.username
    )

    // Derive pagination from the combined result
    const maxPage = Math.max(1, Math.ceil(repositories.length / perPage))
    const currentPage = Math.min(requestedPage, maxPage)
    const start = (currentPage - 1) * perPage
    const end = start + perPage
    const pageRepos = repositories.slice(start, end)

    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl space-y-6 font-mono text-sm">
          <div className="flex items-center gap-4">
            {profile?.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt={`${profile.login || params.username} avatar`}
                className="w-12 h-12 rounded-full border"
                width={48}
                height={48}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.name || params.username}
              </h1>
              {profile?.login && (
                <div className="text-stone-600">@{profile.login}</div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold mt-6">Repositories</h2>
          <RepositoryList
            repositories={pageRepos}
            currentPage={currentPage}
            maxPage={maxPage}
            username={params.username}
          />

          {authUser?.login?.toLowerCase() === params.username.toLowerCase() && (
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
  } catch (error) {
    if (error instanceof GitHubError) {
      // Handle specific GitHub errors
      throw new Error(`GitHub Error: ${error.message}`)
    }
    // Handle other errors
    throw new Error("Failed to fetch repositories")
  }
}
