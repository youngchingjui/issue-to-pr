import NoRepoCTA from "@/components/common/NoRepoCTA"
import NewTaskContainer from "@/components/issues/NewTaskContainer"
import { listUserAppRepositories } from "@/lib/github/repos"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssueDashboard() {
  const repos = await listUserAppRepositories()
  const firstRepo = repos.length > 0 ? repos[0] : null

  if (!firstRepo) {
    // No repositories with the GitHub App installed → show installation CTA
    return <NoRepoCTA />
  }

  const repoFullName = repoFullNameSchema.parse(firstRepo.full_name)
  return <NewTaskContainer repoFullName={repoFullName} repositories={repos} />
}
