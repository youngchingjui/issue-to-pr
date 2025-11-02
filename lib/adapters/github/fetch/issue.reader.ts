import { err, ok, type Result } from "shared/entities/result"
import type {
  GetIssueErrors,
  IssueListItem,
  IssueReaderPort,
  ListIssuesParams,
} from "shared/ports/github/issue.reader"
import { z } from "zod"

// Minimal shape we need from GitHub issue list endpoint
const GitHubIssueLiteSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string().nullable(),
  state: z.enum(["open", "closed"]).default("open"),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable().optional(),
  user: z.object({ login: z.string() }).nullable().optional(),
  pull_request: z.any().optional(),
})

const GitHubIssueListSchema = z.array(GitHubIssueLiteSchema)

function isRateLimited(res: Response, message?: string | null): boolean {
  if (res.status === 429) return true
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining")
    if (remaining === "0") return true
  }
  if (typeof message === "string" && /rate\s*limit/i.test(message)) return true
  return false
}

export function makeFetchIssueReaderAdapter(params: {
  token: string
  userAgent?: string
}): IssueReaderPort {
  const { token, userAgent = "Issue To PR/1.0.0 (https://issuetopr.dev)" } =
    params

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": userAgent,
  }

  async function listForRepo(
    params: ListIssuesParams
  ): Promise<Result<IssueListItem[], GetIssueErrors>> {
    const { repoFullName, page = 1, per_page = 25, state = "open" } = params
    const [owner, repo] = repoFullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`)
    url.searchParams.set("page", String(page))
    url.searchParams.set("per_page", String(per_page))
    url.searchParams.set("state", state)

    try {
      const res = await fetch(url.toString(), {
        headers: baseHeaders,
        next: { revalidate: 60, tags: ["issues-list", repoFullName] },
      })

      if (!res.ok) {
        const retryAfter = res.headers.get("retry-after")

        if (res.status === 401)
          return err("AuthRequired", {
            status: res.status,
            message: res.statusText,
          })
        if (res.status === 404)
          return err("RepoNotFound", {
            status: res.status,
            message: res.statusText,
          })
        if (isRateLimited(res))
          return err("RateLimited", {
            status: res.status,
            message: res.statusText,
            retryAfter,
          })
        if (res.status === 403)
          return err("Forbidden", {
            status: res.status,
            message: res.statusText,
          })
        return err("Unknown", { status: res.status, message: res.statusText })
      }

      const json = await res.json()
      const parsed = GitHubIssueListSchema.parse(json)

      // Filter out pull requests, then map to provider-agnostic list items
      const issues: IssueListItem[] = parsed
        .filter((i) => !("pull_request" in i) || i.pull_request == null)
        .map((i) => ({
          id: i.id,
          repoFullName,
          number: i.number,
          title: i.title,
          state: i.state === "open" ? "OPEN" : "CLOSED",
          url: i.html_url,
          authorLogin: i.user?.login ?? null,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          closedAt: i.closed_at ?? null,
        }))

      return ok(issues)
    } catch (e) {
      console.error("[fetch/issues] Unexpected error", e)
      return err("Unknown", e as { message?: string })
    }
  }

  // Unused in this adapter for now; satisfy port with minimal stubs
  async function getIssue() {
    return err("Unknown") as unknown as Result<IssueListItem, GetIssueErrors>
  }
  async function getIssueTitles() {
    return []
  }

  return {
    listForRepo,
    getIssue,
    getIssueTitles,
  }
}
