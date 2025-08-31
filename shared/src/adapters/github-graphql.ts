import { graphql } from "@octokit/graphql"

import type {
  CreateIssueInput,
  GithubIssueErrors,
  GitHubIssuesPort,
  Issue,
  IssueRef,
  IssueTitleResult,
} from "@/shared/src/core/ports/github"
import { err, ok, type Result } from "@/shared/src/entities/result"

/**
 * Factory to create a GraphQL-based GitHub adapter implementing GitHubIssuesPort.
 */
export function makeGitHubGraphQLAdapter(params: {
  token: string
}): GitHubIssuesPort {
  const token = params.token
  const client = graphql.defaults({
    headers: { authorization: `token ${token}` },
  })

  async function getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]> {
    if (refs.length === 0) return []

    const queries = refs.map((ref, idx) => {
      const [owner, name] = ref.repoFullName.split("/")
      const alias = `i${idx}`
      return `${alias}: repository(owner: \"${owner}\", name: \"${name}\") { issue(number: ${ref.number}) { number title state } }`
    })
    const query = `query BatchIssues { ${queries.join(" ")} }`

    type IssueNode = { number: number; title: string; state: "OPEN" | "CLOSED" }
    type QueryResponse = Record<string, { issue: IssueNode | null } | null>

    const data = await client<QueryResponse>(query)

    const results: IssueTitleResult[] = refs.map((ref, idx) => {
      const alias = `i${idx}`
      const issue = data?.[alias]?.issue
      return {
        repoFullName: ref.repoFullName,
        number: ref.number,
        title: issue?.title ?? null,
        state: issue?.state,
      }
    })
    return results
  }

  async function createIssue(
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>> {
    try {
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

  return { getIssueTitles, createIssue }
}

// Backwards-compatible alias used elsewhere in the app
export const makeGithubGraphQLAdapter = (token: string): GitHubIssuesPort =>
  makeGitHubGraphQLAdapter({ token })
