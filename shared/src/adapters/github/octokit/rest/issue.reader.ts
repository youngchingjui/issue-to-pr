import { Octokit } from "@octokit/rest"

import {
  GetIssueErrors,
  IssueDetails,
  IssueReaderPort,
  IssueRef,
  IssueTitleResult,
} from "@/shared/src/core/ports/github/issue.reader"
import { err, ok, Result } from "@/shared/src/entities/result"

/**
 * Octokit GraphQL adapter factory focused on GitHub issue reader.
 */
export function makeIssuesReaderAdapter(params: {
  token: string
}): IssueReaderPort {
  const { token } = params
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
          .filter((l): l is string => l !== undefined)
          .filter((l): l is string => l !== null),
        assignees: (Array.isArray(data.assignees) ? data.assignees : [])
          .map((a: { login: string }) => a?.login)
          .filter(Boolean),
        createdAt: data.created_at ?? new Date().toISOString(),
        updatedAt: data.updated_at ?? new Date().toISOString(),
        closedAt: data.closed_at ?? null,
      }
      return ok(details)
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) return err("Unknown")
      if (
        "status" in e &&
        typeof e.status === "number" &&
        "message" in e &&
        typeof e.message === "string"
      ) {
        switch (e.status) {
          case 401:
            return err("AuthRequired", { message: e.message })
          case 403:
            return err("Forbidden", { message: e.message })
          case 404:
            return err("NotFound", { message: e.message })
          case 429:
            return err("RateLimited", { message: e.message })
        }
        return err("Unknown", { message: e.message })
      }
      return err("Unknown", { message: String(e) })
    }
  }

  // TODO: Seems it will make a network call for each issue.
  // Might consider calling listIssues with pagination for each repo, reducing number of requests.
  const getIssueTitles = async (
    refs: IssueRef[]
  ): Promise<IssueTitleResult[]> => {
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

  return {
    getIssue,
    getIssueTitles,
  }
}

export default makeIssuesReaderAdapter
