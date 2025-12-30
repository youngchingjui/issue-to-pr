import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/entities/result"
import type {
  GetIssueErrors,
  IssueDetails,
  IssueListItem,
  IssueReaderPort,
  IssueRef,
  IssueTitleResult,
  ListIssuesParams,
} from "@/ports/github/issue.reader"

/**
 * Factory to create a REST-based GitHub adapter implementing IssueReaderPort.
 */
export function makeIssueReaderAdapter(params: {
  token: string
}): IssueReaderPort {
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
          .map((l) => (typeof l === "string" ? l : l?.name))
          .filter(Boolean) as string[],
        assignees: (Array.isArray(data.assignees) ? data.assignees : [])
          .map((a) => a?.login)
          .filter(Boolean) as string[],
        createdAt: data.created_at ?? new Date().toISOString(),
        updatedAt: data.updated_at ?? new Date().toISOString(),
        closedAt: data.closed_at ?? null,
      }
      return ok(details)
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) return err("Unknown")
      const anyErr = e as { status?: number; message?: string }
      if (anyErr.status === 404)
        return err("NotFound", { message: anyErr.message })
      if (anyErr.status === 403)
        return err("Forbidden", { message: anyErr.message })
      if (anyErr.status === 401)
        return err("AuthRequired", { message: anyErr.message })
      if (anyErr.status === 429)
        return err("RateLimited", { message: anyErr.message })
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

  async function listIssues(
    params: ListIssuesParams
  ): Promise<Result<IssueListItem[], GetIssueErrors>> {
    // no-op, to be implemented
    return ok([])
  }

  return {
    getIssue,
    getIssueTitles,
    listIssues,
  }
}

export default makeIssueReaderAdapter
