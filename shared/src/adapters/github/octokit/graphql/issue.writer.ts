import { graphql } from "@octokit/graphql"
import { err, ok, type Result } from "@shared/entities/result"
import {
  CreateIssueInput,
  GithubIssueErrors,
  Issue,
  IssueWriterPort,
} from "@shared/ports/github/issue.writer"

/**
 * Octokit GraphQL adapter factory focused on GitHub issue writer.
 */
export function makeIssuesWriterAdapter(params: {
  token: string
}): IssueWriterPort {
  const client = graphql.defaults({
    headers: { authorization: `token ${params.token}` },
  })

  const createIssue = async (
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>> => {
    try {
      // TODO: It's strange we need to make 2 queries to get the repository id and then create the issue.
      // We should be able to do this in a single query.
      const repoResult = await client<{ repository: { id: string } | null }>(
        `query RepoId($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id } }`,
        { owner: input.owner, name: input.repo }
      )

      const repositoryId = repoResult.repository?.id
      if (!repositoryId) {
        return err("RepoNotFound")
      }

      const createResult = await client<{
        createIssue: {
          issue: { databaseId: number; number: number; url: string }
        }
      }>(
        `mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String) {
            createIssue(input: { repositoryId: $repositoryId, title: $title, body: $body }) {
              issue { databaseId number url }
            }
          }`,
        { repositoryId, title: input.title, body: input.body ?? null }
      )

      const issue = createResult.createIssue.issue
      return ok({ id: issue.databaseId, number: issue.number, url: issue.url })
    } catch (e: unknown) {
      let message: string | undefined
      let status: number | undefined

      const errObj = e as Record<string, unknown> | null
      if (errObj && typeof errObj === "object") {
        if (typeof errObj.message === "string") {
          message = errObj.message
        }
        if (typeof errObj.status === "number") {
          status = errObj.status
        } else if (
          errObj.response &&
          typeof (errObj.response as Record<string, unknown>).status ===
            "number"
        ) {
          status = (errObj.response as Record<string, unknown>).status as number
        }
      }

      if (status === 401 || status === 403) {
        return err("AuthRequired", { message, status })
      }

      if (
        typeof message === "string" &&
        /issues?\s+.*disabled/i.test(message)
      ) {
        return err("IssuesDisabled", { message })
      }

      if (typeof message === "string" && /rate\s*limit/i.test(message)) {
        return err("RateLimited", { message })
      }

      if (
        status === 422 ||
        (typeof message === "string" && /validation/i.test(message))
      ) {
        return err("ValidationFailed", { message, status })
      }

      return err("Unknown", { message, status })
    }
  }

  return { createIssue }
}
