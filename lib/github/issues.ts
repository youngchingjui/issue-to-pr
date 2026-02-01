"use server"

import { makeFetchIssueReaderAdapter } from "@/lib/adapters/github/fetch/issue.reader"
import { auth } from "@/lib/auth/cached"
import getOctokit, { getGraphQLClient, getUserOctokit } from "@/lib/github"
import {
  getLatestPlanIdsForIssues,
  getPlanStatusForIssues,
} from "@/lib/neo4j/services/plan"
import {
  getIssuesActiveWorkflowMap,
  getIssuesLatestRunningWorkflowIdMap,
} from "@/lib/neo4j/services/workflow"
import {
  GetIssueResult,
  GitHubIssue,
  GitHubIssueComment,
  ListForRepoParams,
} from "@/lib/types/github"
import {
  makeAccessTokenProviderFrom,
  makeSessionProvider,
} from "@/shared/providers/auth"

type CreateIssueParams = {
  repo: string
  owner: string
  title: string
  body: string
}

export async function createIssue({
  repo,
  owner,
  title,
  body,
}: CreateIssueParams) {
  const octokit = await getUserOctokit()
  if (!octokit) throw new Error("No octokit found")
  return await octokit.rest.issues.create({ owner, repo, title, body })
}

// Updated: fetch single issue from GitHub with structured error result
export async function getIssue({
  fullName,
  issueNumber,
}: {
  fullName: string
  issueNumber: number
}): Promise<GetIssueResult> {
  const octokit = await getOctokit()
  if (!octokit) {
    return { type: "other_error", error: "No octokit found" }
  }
  const [owner, repo] = fullName.split("/")
  if (!owner || !repo) {
    return { type: "not_found" }
  }
  try {
    const issue = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })
    return { type: "success", issue: issue.data }
  } catch (error: unknown) {
    if (!error) {
      return { type: "other_error", error: "Unknown error" }
    }
    const http = error as { status?: number }
    if (typeof http === "object" && http && "status" in http) {
      if (http.status === 404) {
        return { type: "not_found" }
      }
      if (http.status === 403) {
        return { type: "forbidden" }
      }
    }
    return { type: "other_error", error }
  }
}

export async function createIssueComment({
  issueNumber,
  repoFullName,
  comment,
}: {
  issueNumber: number
  repoFullName: string
  comment: string
}): Promise<GitHubIssueComment> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const issue = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: comment,
  })
  return issue.data
}

export async function getIssueComments({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<GitHubIssueComment[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  })
  return comments.data as GitHubIssueComment[]
}

// New: use Next.js fetch-based adapter to leverage caching and tags
async function getUserAccessToken(): Promise<string | null> {
  const sessionProvider = makeSessionProvider(() => auth())
  const accessTokenProvider = makeAccessTokenProviderFrom(
    sessionProvider,
    (s) => s?.token?.access_token as unknown as string | null | undefined
  )
  try {
    return await accessTokenProvider()
  } catch {
    return null
  }
}

export async function getIssueList({
  repoFullName,
  ...rest
}: {
  repoFullName: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<GitHubIssue[]> {
  const token = await getUserAccessToken()
  if (!token) {
    // If no user token, fall back to old path (non-cached) to avoid breaking
    const octokit = await getOctokit()
    const [owner, repo] = repoFullName.split("/")

    if (!octokit) {
      throw new Error("No octokit found")
    }

    const issuesResponse = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      ...rest,
    })
    return issuesResponse.data.filter((issue) => !issue.pull_request)
  }

  const adapter = makeFetchIssueReaderAdapter({ token })
  const state = (rest.state as "open" | "closed" | "all" | undefined) ?? "open"
  const page = (rest.page as number | undefined) ?? 1
  const per_page = (rest.per_page as number | undefined) ?? 25

  const res = await adapter.listIssues({
    repoFullName,
    page,
    per_page,
    state,
  })

  if (!res.ok) {
    // gracefully degrade with empty
    return []
  }

  // Map provider-agnostic list items to GitHubIssue-like objects used by UI
  const items = res.value
  const mapped: GitHubIssue[] = items.map(
    (i) =>
      ({
        id: i.id,
        number: i.number,
        title: i.title ?? "",
        state: i.state === "OPEN" ? "open" : "closed",
        html_url: i.url,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        closed_at: i.closedAt ?? undefined,
        user: i.authorLogin ? { login: i.authorLogin } : undefined,
      }) as GitHubIssue
  )

  return mapped
}

export async function updateIssueComment({
  commentId,
  repoFullName,
  comment,
}: {
  commentId: number
  repoFullName: string
  comment: string
}): Promise<GitHubIssueComment> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")
  if (!octokit) {
    throw new Error("No octokit found")
  }
  try {
    const updatedComment = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: comment,
    })
    return updatedComment.data
  } catch (error) {
    console.error(`Failed to update comment: ${commentId}`, error)
    throw error
  }
}

/**
 * Aggregates GitHub issues with Neo4j plan, PR, and workflow status
 */
export type IssueWithStatus = GitHubIssue & {
  hasPlan: boolean
  hasPR: boolean
  hasActiveWorkflow: boolean
  activeWorkflowId?: string | null
  planId?: string | null
  prNumber?: number
}

/**
 * For a repo, get list of issues with hasPlan, hasPR, and active workflow badges.
 */
export async function getIssueListWithStatus({
  repoFullName,
  ...rest
}: {
  repoFullName: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<IssueWithStatus[]> {
  // 1. Get issues from GitHub
  const issues = await getIssueList({ repoFullName, ...rest })

  // 2. Query Neo4j for plans using the service layer
  const issueNumbers = issues.map((issue) => issue.number)
  const [
    issuePlanStatus,
    issuePlanIds,
    activeWorkflowMap,
    activeWorkflowIdMap,
  ] = await Promise.all([
    getPlanStatusForIssues({ repoFullName, issueNumbers }),
    getLatestPlanIdsForIssues({ repoFullName, issueNumbers }),
    getIssuesActiveWorkflowMap({ repoFullName, issueNumbers }),
    getIssuesLatestRunningWorkflowIdMap({ repoFullName, issueNumbers }),
  ])

  // 3. Build response combining data
  const withStatus: IssueWithStatus[] = issues.map((issue) => {
    return {
      ...issue,
      hasPlan: issuePlanStatus[issue.number] || false,
      // Lazily load PR info on the client to avoid heavy initial GraphQL scans
      hasPR: false,
      hasActiveWorkflow: !!activeWorkflowMap[issue.number],
      activeWorkflowId: activeWorkflowIdMap[issue.number] || null,
      planId: issuePlanIds[issue.number] || null,
      prNumber: undefined,
    }
  })

  return withStatus
}

/**
 * Lightweight GraphQL call to find a PR linked to a specific issue number.
 * This avoids scanning all PRs in the repository.
 */
export async function getLinkedPRNumberForIssue({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<number | null> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  const query = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT, REFERENCED_EVENT]) {
            nodes {
              __typename
              ... on CrossReferencedEvent {
                isCrossRepository
                 willCloseTarget
                source {
                  __typename
                  ... on PullRequest {
                    number
                    state
                  }
                }
              }
              ... on ReferencedEvent {
                subject {
                  __typename
                  ... on PullRequest { number state }
                }
              }
            }
          }
        }
      }
    }
  `

  type Node =
    | {
        __typename: "CrossReferencedEvent"
        isCrossRepository: boolean
        willCloseTarget: boolean
        source: { __typename: string; number?: number; state?: string } | null
      }
    | {
        __typename: "ReferencedEvent"
        subject: { __typename: string; number?: number; state?: string } | null
      }

  interface Resp {
    repository: {
      issue: {
        timelineItems: { nodes: Node[] }
      } | null
    } | null
  }

  const variables = { owner, repo, issueNumber }
  const resp = (await graphqlWithAuth<Resp>(query, variables)) as Resp

  const nodes = resp.repository?.issue?.timelineItems?.nodes || []

  // helper to check OPEN state
  const isOpen = (state?: string) => state === "OPEN"

  // Prefer PRs that will close this issue when merged and are open
  for (const n of nodes) {
    if (n.__typename === "CrossReferencedEvent" && n.willCloseTarget) {
      if (
        n.source?.__typename === "PullRequest" &&
        n.source.number &&
        isOpen(n.source.state)
      ) {
        return n.source.number
      }
    }
  }
  // Fallback: any PR reference that is open
  for (const n of nodes) {
    if (n.__typename === "ReferencedEvent") {
      if (
        n.subject?.__typename === "PullRequest" &&
        n.subject.number &&
        isOpen(n.subject.state)
      ) {
        return n.subject.number
      }
    }
    if (n.__typename === "CrossReferencedEvent") {
      if (
        n.source?.__typename === "PullRequest" &&
        n.source.number &&
        isOpen(n.source.state)
      ) {
        return n.source.number
      }
    }
  }

  return null
}

export async function getLinkedPRNumbersForIssues({
  repoFullName,
  issueNumbers,
}: {
  repoFullName: string
  issueNumbers: number[]
}): Promise<Record<number, number | null>> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  // Build a single query with field aliases, one per issueNumber
  // Example alias: i_123: issue(number: 123) { ... }
  const issueFields = issueNumbers
    .map(
      (n) => `
        i_${n}: issue(number: ${n}) {
          timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT, REFERENCED_EVENT]) {
            nodes {
              __typename
              ... on CrossReferencedEvent {
                isCrossRepository
                willCloseTarget
                source {
                  __typename
                  ... on PullRequest { number state }
                }
              }
              ... on ReferencedEvent {
                subject {
                  __typename
                  ... on PullRequest { number state }
                }
              }
            }
          }
        }
      `
    )
    .join("\n")

  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        ${issueFields}
      }
    }
  `

  type Node =
    | {
        __typename: "CrossReferencedEvent"
        isCrossRepository: boolean
        willCloseTarget: boolean
        source: { __typename: string; number?: number; state?: string } | null
      }
    | {
        __typename: "ReferencedEvent"
        subject: { __typename: string; number?: number; state?: string } | null
      }

  type Resp = {
    repository: Record<
      string,
      {
        timelineItems: { nodes: Node[] }
      } | null
    > | null
  }

  const variables = { owner, repo }
  const resp = (await graphqlWithAuth<Resp>(query, variables)) as Resp

  const repository = resp.repository || {}
  const result: Record<number, number | null> = {}

  const isOpen = (state?: string) => state === "OPEN"

  for (const issueNumber of issueNumbers) {
    const key = `i_${issueNumber}`
    const issue = repository[key]
    if (!issue) {
      result[issueNumber] = null
      continue
    }
    const nodes = issue.timelineItems?.nodes || []

    // Prefer PRs that will close this issue when merged
    let found: number | null = null
    for (const n of nodes) {
      if (n.__typename === "CrossReferencedEvent" && n.willCloseTarget) {
        const prNum =
          n.source?.__typename === "PullRequest" ? n.source.number : undefined
        const prState =
          n.source?.__typename === "PullRequest" ? n.source.state : undefined
        if (typeof prNum === "number" && isOpen(prState)) {
          found = prNum
          break
        }
      }
    }
    // Fallback: any PR reference
    if (found == null) {
      for (const n of nodes) {
        if (n.__typename === "ReferencedEvent") {
          const prNum =
            n.subject?.__typename === "PullRequest"
              ? n.subject.number
              : undefined
          const prState =
            n.subject?.__typename === "PullRequest"
              ? n.subject.state
              : undefined
          if (typeof prNum === "number" && isOpen(prState)) {
            found = prNum
            break
          }
        }
        if (n.__typename === "CrossReferencedEvent") {
          const prNum =
            n.source?.__typename === "PullRequest" ? n.source.number : undefined
          const prState =
            n.source?.__typename === "PullRequest" ? n.source.state : undefined
          if (typeof prNum === "number" && isOpen(prState)) {
            found = prNum
            break
          }
        }
      }
    }

    result[issueNumber] = found
  }

  return result
}
