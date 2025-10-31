import { revalidateTag } from "next/cache"

/**
 * Revalidate the Next.js fetch cache for the list of repositories a user
 * can access via a GitHub App installation.
 *
 * We tag all relevant fetch() requests with the tag "user-installations"
 * (and some more granular tags like installation id + "repositories").
 * Revalidating the shared "user-installations" tag is sufficient to bust
 * the cache for both the installations list and each installation's repo list.
 */
export async function revalidateUserInstallationReposCache(_params: {
  installationId: string
}) {
  // Broadly invalidate the cache related to user installations and their repos
  revalidateTag("user-installations")
}

