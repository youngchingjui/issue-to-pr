"use server"

import { z } from "zod"

import { getGraphQLClient } from "@/lib/github"
import { withTiming } from "@/shared/utils/telemetry"

const PullRequestConflictContextQuery = `
  query PullRequestConflictContext($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        number
        title
        body
        state
        isDraft
        url
        createdAt
        updatedAt
        author { login }
        baseRefName
        headRefName
        headRepositoryOwner { login }
        headRepository { nameWithOwner }
        mergeable
        mergeStateStatus
        reviewDecision
        files(first: 100) {
          nodes {
            path
            changeType
            additions
            deletions
          }
          pageInfo { hasNextPage endCursor }
        }
        closingIssuesReferences(first: 10) {
          nodes { number title state url }
        }
      }
    }
  }
` as const

// Zod schemas for a subset of fields we rely on
const FileNodeSchema = z.object({
  path: z.string(),
  changeType: z.string().nullable().optional(),
  additions: z.number().optional().default(0),
  deletions: z.number().optional().default(0),
})

const LinkedIssueSchema = z.object({
  number: z.number(),
  title: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
})

const PullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.string(),
  isDraft: z.boolean(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({ login: z.string().nullable() }).nullable(),
  baseRefName: z.string(),
  headRefName: z.string(),
  headRepositoryOwner: z.object({ login: z.string().nullable() }).nullable(),
  headRepository: z.object({ nameWithOwner: z.string().nullable() }).nullable(),
  mergeable: z.enum(["MERGEABLE", "CONFLICTING", "UNKNOWN"]),
  mergeStateStatus: z.string().nullable().optional(),
  reviewDecision: z.string().nullable().optional(),
  files: z
    .object({ nodes: z.array(FileNodeSchema) })
    .nullable()
    .optional(),
  closingIssuesReferences: z
    .object({ nodes: z.array(LinkedIssueSchema) })
    .nullable()
    .optional(),
})

const ResponseSchema = z.object({
  repository: z
    .object({
      pullRequest: PullRequestSchema.nullable(),
    })
    .nullable(),
})

export type PullRequestConflictContext = z.infer<typeof PullRequestSchema> & {
  linkedIssueNumbers: number[]
}

export async function getPullRequestConflictContext({
  repoFullName,
  pullNumber,
}: {
  repoFullName: string
  pullNumber: number
}): Promise<PullRequestConflictContext> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  const data = await withTiming(
    `GitHub GraphQL: PullRequestConflictContext ${repoFullName}#${pullNumber}`,
    () =>
      graphqlWithAuth<unknown>(PullRequestConflictContextQuery, {
        owner,
        repo,
        number: pullNumber,
      })
  )

  const parsed = ResponseSchema.parse(data)
  const pr = parsed.repository?.pullRequest
  if (!pr) {
    throw new Error(
      `Pull request not found for ${repoFullName}#${pullNumber} (GraphQL)`
    )
  }

  const linkedIssueNumbers =
    pr.closingIssuesReferences?.nodes?.map((n) => n.number) || []

  return {
    ...pr,
    linkedIssueNumbers,
  }
}

// Optional helper to scan for conflicting PRs quickly (useful for batch automation)
const ListConflictingPRsQuery = `
  query ListConflictingPRs($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      pullRequests(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          number
          title
          author { login }
          mergeable
          baseRefName
          headRefName
          createdAt
          updatedAt
        }
      }
    }
  }
` as const

const ConflictingPRNodeSchema = z.object({
  number: z.number(),
  title: z.string(),
  author: z.object({ login: z.string().nullable() }).nullable(),
  mergeable: z.enum(["MERGEABLE", "CONFLICTING", "UNKNOWN"]),
  baseRefName: z.string(),
  headRefName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ListConflictingPRsResponseSchema = z.object({
  repository: z
    .object({
      pullRequests: z.object({ nodes: z.array(ConflictingPRNodeSchema) }),
    })
    .nullable(),
})

export type ConflictingPR = z.infer<typeof ConflictingPRNodeSchema>

export async function listConflictingPullRequests({
  repoFullName,
}: {
  repoFullName: string
}): Promise<ConflictingPR[]> {
  const [owner, repo] = repoFullName.split("/")
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) throw new Error("Could not initialize GraphQL client")

  const data = await withTiming(
    `GitHub GraphQL: listConflictingPRs ${repoFullName}`,
    () => graphqlWithAuth<unknown>(ListConflictingPRsQuery, { owner, repo })
  )

  const parsed = ListConflictingPRsResponseSchema.parse(data)
  const nodes = parsed.repository?.pullRequests?.nodes || []
  return nodes.filter((n) => n.mergeable === "CONFLICTING")
}
