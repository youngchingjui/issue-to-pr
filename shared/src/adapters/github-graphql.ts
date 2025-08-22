import type {
  GitHubIssuesPort,
  IssueRef,
  IssueTitleResult,
} from "@/shared/src/core/ports/github"

// Minimal fetch signature to avoid DOM lib dependency in shared package
type FetchResponse = {
  ok: boolean
  status: number
  text: () => Promise<string>
  json: () => Promise<unknown>
}

type FetchInit = {
  method?: string
  headers?: Record<string, string>
  body?: string
}

type FetchFn = (input: string | URL, init?: FetchInit) => Promise<FetchResponse>

/**
 * Minimal GitHub GraphQL adapter implementing GitHubIssuesPort.
 * Does not use any Next.js specific features so it can run in any environment.
 */
export class GitHubGraphQLAdapter implements GitHubIssuesPort {
  private readonly token: string
  private readonly fetchImpl: FetchFn

  constructor(params?: { token?: string; fetchImpl?: FetchFn }) {
    const token = params?.token ?? process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error("GitHub token is required for GitHubGraphQLAdapter")
    }
    this.token = token
    this.fetchImpl = params?.fetchImpl ?? (globalThis.fetch as FetchFn)
    if (!this.fetchImpl) {
      throw new Error(
        "A fetch implementation must be available in this runtime"
      )
    }
  }

  async getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]> {
    if (refs.length === 0) return []

    // Build dynamic GraphQL query with aliases per issue to preserve input order
    const queries = refs.map((ref, idx) => {
      const [owner, name] = ref.repoFullName.split("/")
      const alias = `i${idx}`
      return `${alias}: repository(owner: \"${owner}\", name: \"${name}\") { issue(number: ${ref.number}) { number title state } }`
    })
    const query = `query BatchIssues { ${queries.join(" ")} }`

    const response = await this.fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`GitHub GraphQL error: ${response.status} ${text}`)
    }

    const json = (await response.json()) as {
      data?: Record<
        string,
        {
          issue: {
            number: number
            title: string
            state: "OPEN" | "CLOSED"
          } | null
        } | null
      >
      errors?: unknown
    }

    // Map results back to input order
    const results: IssueTitleResult[] = refs.map((ref, idx) => {
      const alias = `i${idx}`
      const repo = json.data?.[alias]
      const issue = repo?.issue
      return {
        repoFullName: ref.repoFullName,
        number: ref.number,
        title: issue?.title ?? null,
        state: issue?.state,
      }
    })

    return results
  }
}

export default GitHubGraphQLAdapter
