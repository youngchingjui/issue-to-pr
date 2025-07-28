import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

/**
 * Shared layout for the main "task" experience: repository selection, new task
 * creation, and the issues/tasks table. This component is intentionally UI-only
 * so it can be reused by multiple pages without duplicating JSX.
 */
export default async function NewTaskContainer({ repoFullName }: Props) {
  return (
    <main className="container mx-auto py-10 max-w-4xl w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector selectedRepo={repoFullName.fullName} />
        </div>
      </div>
      <div className="mb-6">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <IssueTable repoFullName={repoFullName} />
    </main>
  )
}
