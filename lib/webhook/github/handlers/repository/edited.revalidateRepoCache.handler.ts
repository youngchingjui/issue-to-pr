import { revalidateTag } from "next/cache"

import type { RepositoryPayload } from "@/lib/webhook/github/types"

/**
 * When repository settings change, revalidate the cache for this repository so
 * subsequent fetches reflect the latest state immediately.
 */
export async function handleRepositoryEditedRevalidate({
  payload,
}: {
  payload: RepositoryPayload
}) {
  const fullName = payload.repository.full_name

  revalidateTag(fullName)
}
