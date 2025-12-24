"use server"

import getOctokit, { getGraphQLClient } from "@/lib/github"
import { IssueOrderField, SearchCodeItem } from "@/lib/types/github"

export type IssueState = "OPEN" | "CLOSED"

export type OrderDirection = "ASC" | "DESC"

export interface SearchReposWithIssuesParams {
  topic?: string
  maxStars?: number
  minStars?: number
  language?: string
  issueLabel?: string
  state: IssueState
  perPage?: number
  page?: number
  createdAfter?: string // ISO date string
  sort: IssueOrderField
  order: OrderDirection
}

export async function searchCode({
  repoFullName,
  query,
}: {
  repoFullName: string
  query: string
}): Promise<Partial<SearchCodeItem>[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await octokit.rest.search.code({
    q: `${query} repo:${repoFullName}`,
  })
  
  // Filter the result items to include only the specified fields
  const filteredItems = response.data.items.map(item => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    description: item.description,
    repository: {
      full_name: item.repository.full_name,
    },
  }))

  return filteredItems
}

export interface SearchIssuesResult {
  issues: Array<{
    id: string
    number: number
    title: string
    body: string
    state: IssueState
    createdAt: string
    updatedAt: string
    url: string
    comments: number
    labels: Array<{
      id: string
      name: string
      color: string
    }>
    author: {
      login: string
    }
    repository: {
      nameWithOwner: string
      description: string | null
      stargazersCount: number
      url: string
    }
  }>
  totalIssuesFound: number
  hasNextPage: boolean
  page: number
}

interface GraphQLIssueSearchResponse {
  search: {
    issueCount: number
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
    nodes: Array<{
      id: string
      number: number
      title: string
      body: string
      state: IssueState
      createdAt: string
      updatedAt: string
      url: string
      comments: {
        totalCount: number
      }
      labels: {
        nodes: Array<{
          id: string
          name: string
          color: string
        }>
      }
      author: {
        login: string
      }
      repository: {
        nameWithOwner: string
        description: string | null
        stargazerCount: number
        url: string
      }
    }>
  }
}

export async function searchAllIssuesGraphQL({
  topic,
  maxStars,
  minStars,
  language,
  issueLabel,
  state = "OPEN",
  perPage = 25,
  page = 1,
  createdAfter,
  sort = "CREATED",
  order = "DESC",
}: SearchReposWithIssuesParams): Promise<SearchIssuesResult> {
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  // Construct issue search query
  let searchQuery = "is:issue"

  // Add state filter
  if (state === "OPEN") searchQuery += " is:open"
  if (state === "CLOSED") searchQuery += " is:closed"

  // Add label filter
  if (issueLabel) searchQuery += ` label:${issueLabel}`

  // Add date filter
  if (createdAfter) searchQuery += ` created:>=${createdAfter}`

  // Add language filter (applies to the repository)
  if (language) searchQuery += ` language:${language}`

  // Add sorting to the search query
  const sortField = sort.toLowerCase().replace("_", "-")
  searchQuery += ` sort:${sortField}-${order.toLowerCase()}`

  // Construct the GraphQL query focusing on issues directly
  const query = `
    query SearchIssues(
      $searchQuery: String!,
      $perPage: Int!,
      $cursor: String
    ) {
      search(query: $searchQuery, type: ISSUE, first: $perPage, after: $cursor) {
        issueCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on Issue {
            id
            number
            title
            body
            state
            createdAt
            updatedAt
            url
            comments {
              totalCount
            }
            labels(first: 10) {
              nodes {
                id
                name
                color
              }
            }
            author {
              login
            }
            repository {
              nameWithOwner
              description
              stargazerCount
              url
            }
          }
        }
      }
    }
  `

  // Prepare variables for the query
  const cursor =
    page > 1 ? (btoa(`cursor:${(page - 1) * perPage}`) as string) : null
  const variables = {
    searchQuery,
    perPage,
    cursor,
  }

  try {
    const response = await graphqlWithAuth<GraphQLIssueSearchResponse>(
      query,
      variables
    )

    // We can filter by stars after the search
    // If minStars or maxStars is specified, filter the results locally
    let filteredIssues = response.search.nodes

    if (minStars !== undefined || maxStars !== undefined) {
      filteredIssues = response.search.nodes.filter((issue) => {
        const stars = issue.repository.stargazerCount
        if (minStars !== undefined && stars < minStars) return false
        if (maxStars !== undefined && stars > maxStars) return false
        return true
      })
    }

    return {
      issues: filteredIssues.map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        url: issue.url,
        comments: issue.comments?.totalCount ?? 0,
        labels:
          issue.labels?.nodes?.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          })) ?? [],
        author: {
          login: issue.author?.login ?? "unknown",
        },
        repository: {
          nameWithOwner: issue.repository.nameWithOwner,
          description: issue.repository.description,
          stargazersCount: issue.repository.stargazerCount,
          url: issue.repository.url,
        },
      })),
      totalIssuesFound: response.search.issueCount,
      hasNextPage: response.search.pageInfo.hasNextPage,
      page,
    }
  } catch (error) {
    console.error("Error searching issues:", error)
    throw error
  }
}
