import { revalidateTag } from "next/cache"
import type { RepositoryPayload } from "@/lib/webhook/github/types"

/**
 * When repository settings change, specifically when `has_issues` is toggled,
 * revalidate the cache for this repository so subsequent fetches reflect the
 * latest state immediately.
 */
export async function handleRepositoryEditedRevalidate({
  payload,
}: {
  payload: RepositoryPayload
}) {
  const fullName = payload.repository.full_name

  // Only revalidate when the has_issues setting was changed.
  const hasIssuesChanged = Boolean(payload.changes?.has_issues)

  if (hasIssuesChanged) {
    // Invalidate fetches tagged with the repo full name. Our GitHub repo reader
    // tags requests with ["repo", repoFullName]. Invalidating the specific
    // repo tag is sufficient and avoids clearing all repos.
    revalidateTag(fullName)
  }
}

