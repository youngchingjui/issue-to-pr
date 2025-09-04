"use server"

import getOctokit, { getGraphQLClient, getUserOctokit } from "@/lib/github"
import {
  getLatestPlanIdsForIssues,
  getPlanStatusForIssues,
} from "@/lib/neo4j/services/plan"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"
import {
  GetIssueResult,
  GitHubIssue,
  GitHubIssueComment,
  ListForRepoParams,
} from "@/lib/types/github"
import { withTiming } from "@/shared/src"

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

export async function getIssueList({
  repoFullName,
  ...rest
}: {
  repoFullName: string
} & Omit<ListForRepoParams, "owner" | "repo">): Promise<GitHubIssue[]> {
  const octokit = await getOctokit()
  const [owner, repo] = repoFullName.split("/")

  if (!octokit) {
    throw new Error("No octokit found")
  }

  const issuesResponse = await withTiming(
    `GitHub REST: issues.listForRepo ${repoFullName}`,
    async () =>
      await octokit.rest.issues.listForRepo({
        owner,
        repo,
        ...rest,
      })
  )
  // Filter out pull requests from the list of issues
  return issuesResponse.data.filter((issue) => !issue.pull_request)
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
  const issues = await withTiming(`GitHub: getIssueList ${repoFullName}`, () =>
    getIssueList({ repoFullName, ...rest })
  )

  // 2. Query Neo4j for plans using the service layer
  const issueNumbers = issues.map((issue) => issue.number)
  const [issuePlanStatus, issuePlanIds] = await Promise.all([
    withTiming(`Neo4j: getPlanStatusForIssues ${repoFullName}`, () =>
      getPlanStatusForIssues({ repoFullName, issueNumbers })
    ),
    withTiming(`Neo4j: getLatestPlanIdsForIssues ${repoFullName}`, () =>
      getLatestPlanIdsForIssues({ repoFullName, issueNumbers })
    ),
  ])

  // 3. Determine active workflows for each issue (simple sequential for now)
  const withStatus: IssueWithStatus[] = await Promise.all(
    issues.map(async (issue) => {
      let hasActiveWorkflow = false
      try {
        const runs = await withTiming(
          `Neo4j: listWorkflowRuns ${repoFullName}#${issue.number}`,
          () =>
            listWorkflowRuns({
              repoFullName,
              issueNumber: issue.number,
            })
        )
        // Only consider a workflow "active" if it is still running (ignore timedOut)
        hasActiveWorkflow = runs.some((r) => r.state === "running")
      } catch (err) {
        console.error(`Issue listing workflow runs: ${String(err)}`)
      }

      return {
        ...issue,
        hasPlan: issuePlanStatus[issue.number] || false,
        // Lazily load PR info on the client to avoid heavy initial GraphQL scans
        hasPR: false,
        hasActiveWorkflow,
        planId: issuePlanIds[issue.number] || null,
        prNumber: undefined,
      }
    })
  )

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
  const resp = (await withTiming(
    `GitHub GraphQL: getLinkedPRNumberForIssue ${repoFullName}#${issueNumber}`,
    () => graphqlWithAuth<Resp>(query, variables)
  )) as Resp

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
  const resp = (await withTiming(
    `GitHub GraphQL: getLinkedPRNumbersForIssues ${repoFullName} [${issueNumbers.join(",")} ]`,
    () => graphqlWithAuth<Resp>(query, variables)
  )) as Resp

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

/**
 * Try to find a preview deployment URL for a given PR by inspecting deployment statuses.
 * Supports common providers like Vercel, Netlify, Cloudflare Pages (but will accept any URL).
 */
export async function getPreviewLinkForPR({
  repoFullName,
  prNumber,
}: {
  repoFullName: string
  prNumber: number
}): Promise<string | null> {
  const octokit = await getOctokit()
  if (!octokit) throw new Error("No octokit found")
  const [owner, repo] = repoFullName.split("/")

  try {
    const pr = await withTiming(
      `GitHub REST: pulls.get ${repoFullName}#${prNumber}`,
      () =>
        octokit.rest.pulls.get({ owner, repo, pull_number: prNumber })
    )
    const sha = pr.data.head.sha

    const deployments = await withTiming(
      `GitHub REST: repos.listDeployments ${repoFullName}@${sha}`,
      () => octokit.rest.repos.listDeployments({ owner, repo, ref: sha })
    )

    // Iterate from newest to oldest for faster match
    for (const dep of deployments.data.sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )) {
      const statuses = await withTiming(
        `GitHub REST: repos.listDeploymentStatuses ${repoFullName} dep#${dep.id}`,
        () =>
          octokit.rest.repos.listDeploymentStatuses({
            owner,
            repo,
            deployment_id: dep.id,
            per_page: 10,
          })
      )

      // Find the latest successful status with a URL, prefer environment_url then target_url
      const sorted = [...statuses.data].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      )
      for (const s of sorted) {
        if (s.state && ["success", "in_progress", "queued"].includes(s.state)) {
          const url = (s.environment_url || s.target_url || undefined) as
            | string
            | undefined
          if (url && isLikelyPreviewUrl(url)) {
            return url
          }
        }
      }
    }
  } catch (err) {
    console.error(
      `getPreviewLinkForPR error for ${repoFullName}#${prNumber}: ${String(err)}`
    )
  }

  return null
}

function isLikelyPreviewUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    return (
      host.endsWith("vercel.app") ||
      host.endsWith("netlify.app") ||
      host.endsWith("pages.dev") ||
      host.includes("preview") ||
      host.includes("staging")
    )
  } catch {
    return false
  }
}

/**
 * Batch helper to get preview links for many issues using their linked PRs map.
 */
export async function getPreviewLinksForPRs({
  repoFullName,
  prNumbersByIssue,
}: {
  repoFullName: string
  prNumbersByIssue: Record<number, number | null>
}): Promise<Record<number, string | null>> {
  const entries = Object.entries(prNumbersByIssue)
  const result: Record<number, string | null> = {}

  for (const [issueStr, prNum] of entries) {
    const issueNumber = Number(issueStr)
    if (!prNum) {
      result[issueNumber] = null
      continue
    }
    const url = await getPreviewLinkForPR({ repoFullName, prNumber: prNum })
    result[issueNumber] = url
  }

  return result
}

