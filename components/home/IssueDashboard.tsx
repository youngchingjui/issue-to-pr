import { cookies } from "next/headers"

import NoRepoCTA from "@/components/common/NoRepoCTA"
import IssueDashboardClient from "@/components/home/IssueDashboardClient"
import { getRepoFromString } from "@/lib/github/content"
import { listUserAppRepositories } from "@/lib/github/repos"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssueDashboard() {
  const repos = await listUserAppRepositories()
  const cookieStore = cookies()
  const lastUsedRepo = cookieStore.get("lastUsedRepo")?.value

  // Prefer last used repo if available and accessible; otherwise fall back to the first repo
  const preferredRepo = lastUsedRepo
    ? repos.find((r) => r.full_name === lastUsedRepo) || repos[0]
    : repos[0]

  if (!preferredRepo) {
    // No repositories with the GitHub App installed → show installation CTA
    return <NoRepoCTA />
  }

  const repoFullName = repoFullNameSchema.parse(preferredRepo.full_name)
  const repo = await getRepoFromString(repoFullName.fullName)
  const issuesEnabled = !!repo.has_issues
  const existingKey = await getUserOpenAIApiKey()
  const hasOpenAIKey = !!(existingKey && existingKey.trim())

  return (
    <IssueDashboardClient
      repoFullName={repoFullName}
      repositories={repos}
      issuesEnabled={issuesEnabled}
      hasOpenAIKey={hasOpenAIKey}
    />
  )
}

