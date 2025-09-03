import { Octokit } from "@octokit/rest"

import type {
  CreateIssueInput,
  GetIssueErrors,
  GithubIssueErrors,
  GitHubIssuesPort,
  Issue,
  IssueDetails,
  IssueRef,
  IssueTitleResult,
} from "@/shared/src/core/ports/github"
import { err, ok, type Result } from "@/shared/src/entities/result"

/**
 * Factory to create a REST-based GitHub adapter implementing GitHubIssuesPort.
 */
export function makeGitHubRESTAdapter(params: {
  token: string
}): GitHubIssuesPort {
  const token = params.token
  const octokit = new Octokit({ auth: token })

  async function getIssue(
    ref: IssueRef
  ): Promise<Result<IssueDetails, GetIssueErrors>> {
    const [owner, repo] = ref.repoFullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")
    try {
      const { data } = await octokit.issues.get({
        owner,
        repo,
        issue_number: ref.number,
      })
      const details: IssueDetails = {
        repoFullName: ref.repoFullName,
        number: data.number ?? ref.number,
        title: data.title ?? null,
        body: data.body ?? null,
        state: (data.state?.toUpperCase() as "OPEN" | "CLOSED") || "OPEN",
        url: data.html_url ?? "",
        authorLogin: data.user?.login ?? null,
        labels: (Array.isArray(data.labels) ? data.labels : [])
          .map((l: any) => (typeof l === "string" ? l : l?.name))
          .filter(Boolean) as string[],
        assignees: (Array.isArray(data.assignees) ? data.assignees : [])
          .map((a: any) => a?.login)
          .filter(Boolean) as string[],
        createdAt: data.created_at ?? new Date().toISOString(),
        updatedAt: data.updated_at ?? new Date().toISOString(),
        closedAt: data.closed_at ?? null,
      }
      return ok(details)
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) return err("Unknown")
      const anyErr = e as { status?: number; message?: string }
      if (anyErr.status === 404) return err("NotFound", { message: anyErr.message })
      if (anyErr.status === 403) return err("Forbidden", { message: anyErr.message })
      if (anyErr.status === 401) return err("AuthRequired", { message: anyErr.message })
      if (anyErr.status === 429) return err("RateLimited", { message: anyErr.message })
      return err("Unknown", { message: anyErr.message })
    }
  }

  // TODO: Seems it will make a network call for each issue.
  // Might consider calling listIssues with pagination for each repo, reducing number of requests.
  async function getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]> {
    if (refs.length === 0) return []

    const results: IssueTitleResult[] = []
    for (const ref of refs) {
      const [owner, repo] = ref.repoFullName.split("/")
      try {
        const { data } = await octokit.issues.get({
          owner,
          repo,
          issue_number: ref.number,
        })
        results.push({
          repoFullName: ref.repoFullName,
          number: ref.number,
          title: data.title ?? null,
          state: (data.state?.toUpperCase() as "OPEN" | "CLOSED") || undefined,
        })
      } catch {
        results.push({
          repoFullName: ref.repoFullName,
          number: ref.number,
          title: null,
        })
      }
    }
    return results
  }

  async function createIssue(
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>> {
    try {
      const { data } = await octokit.issues.create({
        owner: input.owner,
        repo: input.repo,
        title: input.title,
        body: input.body ?? undefined,
      })
      return ok({
        id: data.id ?? 0,
        number: data.number ?? 0,
        url: data.html_url ?? "",
      })
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) {
        return err("Unknown", { message: "Unknown error" })
      }

      let status: number | undefined
      let message: string | undefined
      if ("status" in e && typeof (e as any).status === "number") {
        status = (e as any).status
      }
      if ("message" in e && typeof (e as any).message === "string") {
        message = (e as any).message
      }

      if (status === 401 || status === 403) {
        return err("AuthRequired", { status, message })
      }
      if (status === 404) {
        return err("RepoNotFound", { status, message })
      }
      if (status === 410) {
        return err("IssuesDisabled", { status, message })
      }
      if (status === 422) {
        return err("ValidationFailed", { status, message })
      }
      if (status === 429) {
        return err("RateLimited", { status, message })
      }
      return err("Unknown", { status, message })
    }
  }

  return {
    getIssue,
    getIssueTitles,
    createIssue,
  }
}

export default makeGitHubRESTAdapter

