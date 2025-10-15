import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import NoRepoCTA from "@/components/common/NoRepoCTA"
import NewTaskContainer from "@/components/issues/NewTaskContainer"
import { listUserAppRepositories } from "@/lib/github/repos"
import {
  AuthenticatedUserRepository,
  repoFullNameSchema,
} from "@/lib/types/github"

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // SSR: searchParams injected by Next.js
  const repoFullNameParseResult = repoFullNameSchema.safeParse(
    searchParams?.repo
  )

  let repos: AuthenticatedUserRepository[] | undefined
  // When the ?repo param is missing/invalid, try to fall back to the last used repo from cookies,
  // otherwise fall back to the first repo
  if (!repoFullNameParseResult.success) {
    repos = await listUserAppRepositories()
    const cookieStore = cookies()
    const lastUsedRepo = cookieStore.get("lastUsedRepo")?.value

    // Prefer the last used repo if it exists and is accessible
    if (lastUsedRepo) {
      const match = repos.find((r) => r.full_name === lastUsedRepo)
      if (match) {
        return redirect(`/issues?repo=${encodeURIComponent(match.full_name)}`)
      }
    }

    const firstRepo = repos.length > 0 ? repos[0] : null

    // Still no repo → show installation CTA
    if (!firstRepo) {
      return <NoRepoCTA />
    }

    // Redirect to the first available repository
    return redirect(`/issues?repo=${encodeURIComponent(firstRepo.full_name)}`)
  }

  // Valid repo param → render the main container

  if (!repos) {
    repos = await listUserAppRepositories()
  }

  const repoFullName = repoFullNameParseResult.data
  return <NewTaskContainer repoFullName={repoFullName} repositories={repos} />
}

