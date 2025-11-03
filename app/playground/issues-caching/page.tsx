import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { closeIssueAction } from "@/lib/actions/closeIssue"
import { createIssueAction } from "@/lib/actions/createIssue"
import { makeFetchIssueReaderAdapter } from "@/lib/adapters/github/fetch/issue.reader"

// Edit this to target a different repository
// Format: "owner/repo"
const DEFAULT_REPO = "youngchingjui/openai-realtime-agents-test-playground"

const ISSUE_TAGS = (repoFullName: string) => [
  "issues-list",
  repoFullName,
  `issues-list:${repoFullName}`,
]

type GitHubIssueLite = {
  id: number
  number: number
  title: string
  state: "open" | "closed"
  created_at: string
  pull_request?: unknown
}

async function CreateIssueButton({ repoFullName }: { repoFullName: string }) {
  async function create() {
    "use server"
    const [owner, repo] = repoFullName.split("/")
    const now = new Date().toISOString()
    await createIssueAction({
      owner,
      repo,
      title: `Test issue @ ${now}`,
      body: `Automatically created at ${now}`,
    })
    // Extra: revalidate via tag in case action changes later
    try {
      ISSUE_TAGS(repoFullName).forEach((t) => revalidateTag(t))
    } catch {}
    redirect("/playground/issues-caching")
  }

  return (
    <form action={create}>
      <Button type="submit">Create test issue</Button>
    </form>
  )
}

function CloseIssueForm({
  repoFullName,
  number,
}: {
  repoFullName: string
  number: number
}) {
  async function close() {
    "use server"
    const [owner, repo] = repoFullName.split("/")
    await closeIssueAction({ owner, repo, number })
    try {
      ISSUE_TAGS(repoFullName).forEach((t) => revalidateTag(t))
    } catch {}
    redirect("/playground/issues-caching")
  }

  return (
    <form action={close}>
      <Button type="submit" variant="secondary">
        Close
      </Button>
    </form>
  )
}

export default async function Page() {
  const repoFullName = DEFAULT_REPO
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
        <CreateIssueButton repoFullName={repoFullName} />
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
            <CloseIssueForm repoFullName={repoFullName} number={issue.number} />
          </li>
        ))}
      </ul>
    </main>
  )
}
