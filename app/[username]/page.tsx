import RepositoryList from "@/components/RepositoryList"
import {
  combineRepositories,
  getUserRepositories,
} from "@/lib/github/content"
import { GitHubError } from "@/lib/github/content"
import { listUserAppRepositories } from "@/lib/github/repos"
import { getGithubUser } from "@/lib/github/users"
import { AuthenticatedUserRepository } from "@/lib/types/github"

export const dynamic = "force-dynamic"

export default async function Repositories({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { page: string }
}) {
  const page = Number(searchParams.page) || 1
  const perPage = 30

  try {
    // First, get the authenticated user to check if we're viewing our own profile
    const authUser = await getGithubUser()
    let repositories: AuthenticatedUserRepository[] = []
    let maxPage = 1

    if (authUser?.login === params.username) {
      // Viewing own profile - show repositories where the GitHub App is installed
      // and that the user has access to (union handled by listUserAppRepositories)
      const result = await listUserAppRepositories()
      repositories = result
      maxPage = 1
    } else {
      // Viewing other user profile
      // First get public repositories
      const publicResult = await getUserRepositories(params.username, {
        per_page: perPage,
        page,
        sort: "updated",
        direction: "desc",
      })

      if (authUser) {
        // If user is authenticated, also try to get repositories they have access to via the app
        try {
          const accessibleResult = await listUserAppRepositories()

          // Filter to only include repos owned by the target username
          const filteredAccessible = accessibleResult.filter(
            (repo) =>
              repo.owner.login.toLowerCase() === params.username.toLowerCase()
          )

          // Combine and deduplicate repositories
          repositories = combineRepositories(
            publicResult.repositories,
            filteredAccessible
          )
          // TODO: Implement proper pagination for combined results
          maxPage = Math.max(publicResult.maxPage, 1)
        } catch (error) {
          // If we fail to get accessible repos, fall back to just public repos
          console.error(error)
          repositories = publicResult.repositories
          maxPage = publicResult.maxPage
        }
      } else {
        // Case 3: Unauthenticated user - only show public repos
        repositories = publicResult.repositories
        maxPage = publicResult.maxPage
      }
    }

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
  } catch (error) {
    if (error instanceof GitHubError) {
      // Handle specific GitHub errors
      throw new Error(`GitHub Error: ${error.message}`)
    }
    // Handle other errors
    throw new Error("Failed to fetch repositories")
  }
}

