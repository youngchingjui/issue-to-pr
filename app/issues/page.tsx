import { redirect } from "next/navigation"

import NoRepoCTA from "@/components/common/NoRepoCTA"
import NewTaskContainer from "@/components/issues/NewTaskContainer"
import { listUserAppRepositories } from "@/lib/github/repos"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // SSR: searchParams injected by Next.js
  const repoFullNameParseResult = repoFullNameSchema.safeParse(
    searchParams?.repo
  )

  // When the ?repo param is missing/invalid, try to fall back to the first repo
  if (!repoFullNameParseResult.success) {
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
