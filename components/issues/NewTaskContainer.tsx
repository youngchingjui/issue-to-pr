import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { AuthenticatedUserRepository, RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
  repositories: AuthenticatedUserRepository[]
}

/**
 * Shared layout for the main "task" experience: repository selection, new task
 * creation, and the issues/tasks table. This component is intentionally UI-only
 * so it can be reused by multiple pages without duplicating JSX.
 */
export default async function NewTaskContainer({
  repoFullName,
  repositories,
}: Props) {
  return (
    <main className="mx-auto max-w-4xl w-full py-10 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector
            selectedRepo={repoFullName.fullName}
            repositories={repositories}
          />
        </div>
      </div>
      <div className="mb-6">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <IssueTable repoFullName={repoFullName} />
    </main>
  )
}
