import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { IssueListProvider } from "@/components/issues/IssueListProvider"
import { listUserRepositoriesGraphQL } from "@/lib/github/users"
import { repoFullNameSchema } from "@/lib/types/github"

export default async function IssueDashboard() {
  const repos = await listUserRepositoriesGraphQL()
  const firstRepo = repos[0]
  if (!firstRepo) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Your Issues</h1>
        <div className="text-destructive">
          You have no accessible repositories. Please add or connect a GitHub
          account with repositories.
        </div>
      </div>
    )
  }
  const repoFullName = repoFullNameSchema.parse(firstRepo.nameWithOwner)

  return (
    <main className="container mx-auto py-10 max-w-4xl w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector selectedRepo={repoFullName.fullName} />
        </div>
      </div>
      <IssueListProvider repoFullName={repoFullName}>
        <div className="mb-8">
          <NewTaskInput repoFullName={repoFullName} />
        </div>
        <IssueTable repoFullName={repoFullName} />
      </IssueListProvider>
    </main>
  )
}

