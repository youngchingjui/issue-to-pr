import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { getRepoFromString } from "@/lib/github/content"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
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
  const repo = await getRepoFromString(repoFullName.fullName)
  const issuesEnabled = !!repo.has_issues
  const existingKey = await getUserOpenAIApiKey()
  const hasOpenAIKey = !!(existingKey && existingKey.trim())

  return (
    <main className="mx-auto max-w-4xl w-full py-10 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector selectedRepo={repoFullName.fullName} />
        </div>
      </div>

      {!issuesEnabled ? (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="mb-1 font-medium">
            GitHub Issues are disabled for this repository.
          </p>
          <p>
            To enable issues, visit the repository settings on GitHub and turn
            on the Issues feature.{" "}
            <a
              href={`https://github.com/${repoFullName.owner}/${repoFullName.repo}/settings#features`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open GitHub settings
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <NewTaskInput
          repoFullName={repoFullName}
          issuesEnabled={issuesEnabled}
          hasOpenAIKey={hasOpenAIKey}
        />
      </div>

      {issuesEnabled ? <IssueTable repoFullName={repoFullName} /> : null}
    </main>
  )
}
