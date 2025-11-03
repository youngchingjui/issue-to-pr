import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { closeIssueAction } from "@/lib/actions/closeIssue"
import { createIssueAction } from "@/lib/actions/createIssue"

// Edit this to target a different repository
// Format: "owner/repo"
const DEFAULT_REPO = "vercel/next.js"

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

async function getIssuesForRepo(repoFullName: string) {
  const session = await auth()
  const token = session?.token?.access_token as string | undefined
  if (!token) return { issues: [], error: "Missing GitHub auth" as const }

  const [owner, repo] = repoFullName.split("/")
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`)
  url.searchParams.set("state", "open")
  url.searchParams.set("per_page", "10")

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Issue To PR/1.0.0 (https://issuetopr.dev)",
    },
    // Opt into Next.js caching with tags so server actions can revalidate
    next: { tags: ISSUE_TAGS(repoFullName) },
  })

  if (!res.ok) return { issues: [], error: res.statusText as const }

  const data = (await res.json()) as unknown
  // Filter out PRs
  const issues = (data as GitHubIssueLite[]).filter((i) => !i.pull_request)
  return { issues }
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

  const { issues, error } = await getIssuesForRepo(repoFullName)

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

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
          Failed to load issues: {String(error)}
        </div>
      ) : null}

      <ul className="space-y-3">
        {issues.map((issue: GitHubIssueLite) => (
          <li
            key={issue.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <div className="font-medium">#{issue.number} {issue.title}</div>
              <div className="text-xs text-muted-foreground">
                {issue.state} • {new Date(issue.created_at).toLocaleString()}
              </div>
            </div>
            <CloseIssueForm repoFullName={repoFullName} number={issue.number} />
          </li>
        ))}
      </ul>
    </main>
  )
}

