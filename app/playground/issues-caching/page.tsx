import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { closeIssueAction } from "@/lib/actions/closeIssue"
import { createIssueAction } from "@/lib/actions/createIssue"
import { makeFetchIssueReaderAdapter } from "@/lib/adapters/github/fetch/issue.reader"

// Edit this to target a different repository
// Format: "owner/repo"
const DEFAULT_REPO = "youngchingjui/openai-realtime-agents-test-playground"

export default async function Page() {
  const repoFullName = DEFAULT_REPO
  const [owner, repo] = repoFullName.split("/")
  const session = await auth()

  if (!session?.token?.access_token) {
    return <div>Please connect your GitHub account to use this page.</div>
  }

  const adapter = makeFetchIssueReaderAdapter({
    token: session?.token?.access_token,
  })

  const issueListResult = await adapter.listIssues({
    repoFullName,
    state: "open",
    per_page: 25,
  })

  if (!issueListResult.ok) {
    return <div>Failed to load issues: {String(issueListResult.error)}</div>
  }

  const issues = issueListResult.value

  return (
    <main className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">GitHub Issues Caching Test</h1>
      <p className="text-sm text-muted-foreground">
        Edit DEFAULT_REPO in app/playground/issues-caching/page.tsx to target a
        different repository. This page uses Next.js fetch caching tags so the
        list updates immediately after creating or closing an issue.
      </p>

      {!session?.token?.access_token ? (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          Please connect your GitHub account to use this page.
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <form
          action={createIssueAction.bind(null, {
            owner,
            repo,
            title: `Test issue @ ${new Date().toISOString()}`,
            body: `Automatically created at ${new Date().toISOString()}`,
          })}
        >
          <Button type="submit">Create test issue</Button>
        </form>
        <span className="text-sm text-muted-foreground">
          Repo: <code>{repoFullName}</code>
        </span>
      </div>

      <ul className="space-y-3">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <div className="font-medium">
                #{issue.number} {issue.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {issue.state} • {new Date(issue.createdAt).toLocaleString()}
              </div>
            </div>
            <form
              action={closeIssueAction.bind(null, {
                owner,
                repo,
                number: issue.number,
              })}
            >
              <Button type="submit" variant="secondary">
                Close
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
