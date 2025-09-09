import NoRepoCTA from "@/components/common/NoRepoCTA"
import IssueDashboardClient from "@/components/home/IssueDashboardClient"
import { getRepoFromString } from "@/lib/github/content"
import { listUserAppRepositories } from "@/lib/github/repos"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssueDashboard() {
  const repos = await listUserAppRepositories()
  const firstRepo = repos.length > 0 ? repos[0] : null

  if (!firstRepo) {
    // No repositories with the GitHub App installed → show installation CTA
    return <NoRepoCTA />
  }

  const repoFullName = repoFullNameSchema.parse(firstRepo.full_name)
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
