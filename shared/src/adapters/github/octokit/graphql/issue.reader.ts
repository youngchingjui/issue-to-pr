import { graphql } from "@octokit/graphql"
import { err, ok, type Result } from "@shared/entities/result"
import type {
  GetIssueErrors,
  IssueDetails,
  IssueReaderPort,
  IssueRef,
  IssueTitleResult,
} from "@shared/ports/github/issue.reader"

/**
 * Minimal Octokit GraphQL adapter focused on GitHub IssueReaderPort.
 */
export function makeIssueReaderAdapter(params: {
  token: string
}): IssueReaderPort {
  const client = graphql.defaults({
    headers: { authorization: `token ${params.token}` },
  })

  const getIssue: IssueReaderPort["getIssue"] = async (
    ref: IssueRef
  ): Promise<Result<IssueDetails, GetIssueErrors>> => {
    const [owner, name] = ref.repoFullName.split("/")
    if (!owner || !name) return err("RepoNotFound")

    const query = `
      query($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          issue(number: $number) {
            number
            title
            body
            state
            url
            createdAt
            updatedAt
            closedAt
            author { login }
            labels(first: 50) { nodes { name } }
            assignees(first: 50) { nodes { login } }
          }
        }
      }
    `

    type Resp = {
      repository: {
        issue: {
          number: number
          title: string | null
          body: string | null
          state: "OPEN" | "CLOSED"
          url: string
          createdAt: string
          updatedAt: string
          closedAt?: string | null
          author: { login: string } | null
          labels: { nodes: { name: string }[] }
          assignees: { nodes: { login: string }[] }
        } | null
      } | null
    }

    try {
      const data = await client<Resp>(query, {
        owner,
        name,
        number: ref.number,
      })

      const issue = data.repository?.issue
      if (!data.repository) return err("RepoNotFound")
      if (!issue) return err("NotFound")

      const details: IssueDetails = {
        repoFullName: ref.repoFullName,
        number: issue.number,
        title: issue.title ?? null,
        body: issue.body ?? null,
        state: issue.state,
        url: issue.url,
        authorLogin: issue.author?.login ?? null,
        labels: (issue.labels?.nodes || []).map((n) => n.name).filter(Boolean),
        assignees: (issue.assignees?.nodes || [])
          .map((n) => n.login)
          .filter(Boolean),
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        closedAt: issue.closedAt ?? null,
      }

      return ok(details)
    } catch (e: unknown) {
      let message: string | undefined
      let status: number | undefined
      const errObj = e as Record<string, unknown> | null
      if (errObj && typeof errObj === "object") {
        if (typeof errObj.message === "string") message = errObj.message
        if (typeof errObj.status === "number") status = errObj.status
        else if (
          errObj.response &&
          typeof (errObj.response as Record<string, unknown>).status ===
            "number"
        ) {
          status = (errObj.response as Record<string, unknown>).status as number
        }
      }

      if (status === 401 || status === 403)
        return err("AuthRequired", { status, message })
      if (typeof message === "string" && /rate\s*limit/i.test(message))
        return err("RateLimited", { message })

      return err("Unknown", { status, message })
    }
  }

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

  return { getIssue, getIssueTitles }
}
