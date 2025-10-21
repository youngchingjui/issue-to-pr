import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import NoRepoCTA from "@/components/common/NoRepoCTA"
import NewTaskContainer from "@/components/issues/NewTaskContainer"
import { listUserAppRepositories } from "@/lib/github/repos"
import { repoFullNameSchema } from "@/lib/types/github"

/**
 * In this page, we just need to redirect to an appropriate repo page
 */
export default async function IssuesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // SSR: searchParams injected by Next.js
  const repoFullNameParseResult = repoFullNameSchema.safeParse(
    searchParams?.repo
  )

  // When the ?repo param is missing/invalid, find a valid repo and redirect to it.
  // Try to find the last used repo from cookies,
  // otherwise fall back to the first repo
  if (!repoFullNameParseResult.success) {
    // Try to load last used repo from cookies first
    const cookieStore = cookies()
    const lastUsedRepo = cookieStore.get("lastUsedRepo")?.value

    // Prefer the last used repo if it exists and is accessible
    if (lastUsedRepo) {
      return redirect(`/issues?repo=${encodeURIComponent(lastUsedRepo)}`)
    }

    // Otherwise, load all repos and redirect to the first one

    // TODO: Might be worthwhile to explore getting only the 1st repo in this network call.
    // However, might be difficult, because we have to get all the installations first, then
    // Get the repos per installation in parallel. Maybe first installation - first repo?
    const repos = await listUserAppRepositories()

    const firstRepo = repos.length > 0 ? repos[0] : null

    // Still no repo → show installation CTA
    if (!firstRepo) {
      return <NoRepoCTA />
    }

    // Redirect to the first available repository
    return redirect(`/issues?repo=${encodeURIComponent(firstRepo.full_name)}`)
  }

  // Valid repo param → render the main container

  const repoFullName = repoFullNameParseResult.data
  return <NewTaskContainer repoFullName={repoFullName} />
}
