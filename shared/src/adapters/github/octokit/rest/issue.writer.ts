import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/shared/entities/result"
import {
  type CreateIssueInput,
  type GithubIssueErrors,
  type Issue,
  IssueWriterPort,
} from "@/shared/ports/github/issue.writer"

/**
 * Factory to create a REST-based GitHub adapter implementing IssueWriterPort.
 */
export function makeIssueWriterAdapter(params: {
  token: string
}): IssueWriterPort {
  const token = params.token
  const octokit = new Octokit({ auth: token })

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
      if ("status" in e && typeof e.status === "number") {
        status = e.status
      }
      if ("message" in e && typeof e.message === "string") {
        message = e.message
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
    createIssue,
  }
}

export default makeIssueWriterAdapter
