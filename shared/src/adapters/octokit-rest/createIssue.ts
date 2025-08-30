import { err, ok, type Result } from "@/shared/src/entities/result"
import type {
  CreateIssueInput,
  GithubIssueErrors,
  GithubIssuesWritePort,
  Issue,
} from "@/shared/src/core/ports/github-issues-write"

// Minimal fetch types to keep shared package environment-agnostic
type FetchResponse = {
  ok: boolean
  status: number
  headers: Headers | { get(name: string): string | null } | Record<string, any>
  text(): Promise<string>
  json(): Promise<any>
}

type FetchInit = {
  method?: string
  headers?: Record<string, string>
  body?: string
}

type FetchFn = (input: string | URL, init?: FetchInit) => Promise<FetchResponse>

export function makeGithubRESTAdapter(token: string, fetchImpl?: FetchFn): GithubIssuesWritePort {
  const f: FetchFn = fetchImpl ?? (globalThis.fetch as any)
  if (!f) throw new Error("A fetch implementation must be available")

  return {
    async createIssue(input: CreateIssueInput): Promise<Result<Issue, GithubIssueErrors>> {
      try {
        const res = await f(`https://api.github.com/repos/${input.owner}/${input.repo}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({ title: input.title, body: input.body }),
        })

        if (res.ok) {
          const data = await res.json()
          return ok({ id: data.id, number: data.number, url: data.html_url })
        }

        // Not OK: map status/message to domain error
        let message = ""
        try {
          const data = await res.json()
          message = (data && (data.message || data.error || data.errors?.[0]?.message)) ?? ""
        } catch {
          try { message = await res.text() } catch { /* ignore */ }
        }

        const status = res.status
        // Centralized mapping from HTTP error → domain error
        if (status === 401 || status === 403) return err("AuthRequired", { message, status })
        if (status === 404) return err("RepoNotFound", { message })
        // GitHub commonly returns 410 or 422 with a message like “Issues are disabled for this repo”
        if ((status === 410 || status === 422) && /issues?\s+(have|has|are)\s+been?\s+disabled/i.test(message)) {
          return err("IssuesDisabled", { message })
        }
        if ((status === 410 || status === 422) && /issues?\s+.*disabled/i.test(message)) {
          return err("IssuesDisabled", { message })
        }
        if (status === 429) {
          const retryAfter = typeof (res.headers as any)?.get === "function" ? (res.headers as any).get("retry-after") : (res as any).headers?.["retry-after"]
          return err("RateLimited", { retryAfter })
        }
        if (status === 422) return err("ValidationFailed", { message })
        return err("Unknown", { message, status })
      } catch (e: any) {
        // Network/unknown failure
        const status = e?.status as number | undefined
        const message = e?.message as string | undefined
        if (status === 401 || status === 403) return err("AuthRequired", { message, status })
        return err("Unknown", { message, status })
      }
    },
  }
}

