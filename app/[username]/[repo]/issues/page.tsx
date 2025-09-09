import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import { getRepoFromString } from "@/lib/github/content"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { repoFullNameSchema } from "@/lib/types/github"

interface Props {
  params: {
    username: string
    repo: string
  }
}

export default async function RepoPage({ params }: Props) {
  const { username, repo } = params

  const repoFullName = repoFullNameSchema.parse(`${username}/${repo}`)
  const repoData = await getRepoFromString(repoFullName.fullName)
  const issuesEnabled = !!repoData.has_issues
  const existingKey = await getUserOpenAIApiKey()
  const hasOpenAIKey = !!(existingKey && existingKey.trim())

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">
          {username} / {repo} - Issues
        </h1>
      </div>

      {!issuesEnabled ? (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="mb-1 font-medium">GitHub Issues are disabled for this repository.</p>
          <p>
            To enable issues, visit the repository settings on GitHub and turn on the
            Issues feature. {" "}
            <a
              href={`https://github.com/${username}/${repo}/settings#features`}
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

      <NewTaskInput repoFullName={repoFullName} issuesEnabled={issuesEnabled} hasOpenAIKey={hasOpenAIKey} />

      {issuesEnabled ? (
        <IssueTable repoFullName={repoFullName} />
      ) : null}
    </main>
  )
}

