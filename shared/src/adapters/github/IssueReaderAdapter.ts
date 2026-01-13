import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/shared/entities/result"
import type {
  GetIssueErrors,
  GitHubAuthMethod,
  IssueDetails,
  IssueListItem,
  IssueReaderPort,
  IssueRef,
  IssueTitleResult,
  ListIssuesParams,
} from "@/shared/ports/github/issue.reader"

/**
 * Creates an Octokit instance based on the provided authentication method
 */
function createOctokitFromAuth(authMethod: GitHubAuthMethod): Octokit {
  switch (authMethod.type) {
    case "oauth_user":
      return new Octokit({ auth: authMethod.token })

    case "app_installation":
      return new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: authMethod.appId,
          privateKey: authMethod.privateKey,
          installationId: authMethod.installationId,
        },
      })

    default:
      throw new Error(`Unrecognized authentication method.`)
  }
}

/**
 * Factory function to create a GitHub adapter implementing the IssueReaderPort interface.
 * This adapter provides a clean interface to GitHub's REST API for reading issues.
 */
export function makeIssueReaderAdapter(
  authMethod: GitHubAuthMethod
): IssueReaderPort
export function makeIssueReaderAdapter(
  authProvider: () => Promise<GitHubAuthMethod>
): IssueReaderPort
export function makeIssueReaderAdapter(
  auth: GitHubAuthMethod | (() => Promise<GitHubAuthMethod>)
): IssueReaderPort {
  let octokit: Octokit | undefined

  async function getOctokit(): Promise<Octokit> {
    if (octokit) return octokit
    const method = typeof auth === "function" ? await auth() : auth
    octokit = createOctokitFromAuth(method)
    return octokit
  }

  async function getIssue(
    ref: IssueRef
  ): Promise<Result<IssueDetails, GetIssueErrors>> {
    try {
      const client = await getOctokit()
      const [owner, repo] = ref.repoFullName.split("/")
      if (!owner || !repo) {
        return err("RepoNotFound")
      }

      const response = await client.rest.issues.get({
        owner,
        repo,
        issue_number: ref.number,
      })

      const issue = response.data

      // Convert GitHub issue to our IssueDetails format
      const issueDetails: IssueDetails = {
        repoFullName: ref.repoFullName,
        number: ref.number,
        title: issue.title,
        body: issue.body || null,
        state: issue.state === "open" ? "OPEN" : "CLOSED",
        url: issue.html_url,
        authorLogin: issue.user?.login || null,
        labels:
          issue.labels
            ?.map((label) => (typeof label === "string" ? label : label.name))
            .filter((name): name is string => name !== undefined) || [],
        assignees: issue.assignees?.map((assignee) => assignee.login) || [],
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at,
      }

      return ok(issueDetails)
    } catch (error) {
      if (typeof error !== "object" || error === null) {
        console.error(error)
        return err("Unknown")
      }
      if ("status" in error && typeof error.status === "number") {
        const http = error as { status: number }
        switch (http.status) {
          case 401:
            return err("AuthRequired")
          case 403:
            return err("Forbidden")
          case 404:
            return err("NotFound")
          case 410:
            return err("IssuesDisabled")
          case 429:
            return err("RateLimited")
          default:
            throw error
        }
      }
      console.error(error)
      return err("Unknown")
    }
  }

  async function getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]> {
    const results: IssueTitleResult[] = []

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < refs.length; i += batchSize) {
      const batch = refs.slice(i, i + batchSize)

      const batchPromises = batch.map(async (ref) => {
        try {
          const client = await getOctokit()
          const [owner, repo] = ref.repoFullName.split("/")
          if (!owner || !repo) {
            return {
              ...ref,
              title: null,
              state: undefined,
            }
          }

          const response = await client.rest.issues.get({
            owner,
            repo,
            issue_number: ref.number,
          })

          return {
            ...ref,
            title: response.data.title,
            state:
              response.data.state === "open"
                ? ("OPEN" as const)
                : ("CLOSED" as const),
          }
        } catch (error) {
          // Return null title for failed requests
          console.error(error)
          return {
            ...ref,
            title: null,
            state: undefined,
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  async function listIssues(
    params: ListIssuesParams
  ): Promise<Result<IssueListItem[], GetIssueErrors>> {
    void params
    // no-op, to be implemented
    return ok([])
  }

  return {
    getIssue,
    getIssueTitles,
    listIssues,
  }
}
