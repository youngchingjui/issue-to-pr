"use server"

import getOctokit, { getGraphQLClient } from "@/lib/github"
import { GitHubIssue, SearchCodeItem } from "@/lib/types/github"

export type IssueState = "OPEN" | "CLOSED"
export type IssueOrderField = "CREATED_AT" | "UPDATED_AT" | "COMMENTS"
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
  createdBefore?: string // ISO date string
  sort: IssueOrderField
  order: OrderDirection
}

export interface SearchReposWithIssuesResult {
  repos: Array<{
    fullName: string
    description: string | null
    stargazersCount: number
    url: string
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
      user: {
        login: string
      }
    }>
  }>
  totalReposFound: number
  reposWithoutIssues: number
  hasNextPage: boolean
  page: number
}

interface GraphQLSearchResponse {
  search: {
    repositoryCount: number
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
    nodes: Array<{
      nameWithOwner: string
      description: string | null
      stargazerCount: number
      url: string
      issues: {
        totalCount: number
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
          user: {
            login: string
          }
        }>
      }
    }>
  }
}

export async function searchCode({
  repoFullName,
  query,
}: {
  repoFullName: string
  query: string
}): Promise<SearchCodeItem[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await octokit.rest.search.code({
    q: `${query} repo:${repoFullName}`,
  })
  return response.data.items
}

export interface RepoSearchResult {
  fullName: string
  description: string | null
  stargazersCount: number
  url: string
}

export async function searchRepos({
  query,
  sort = "stars",
  order = "desc",
  perPage = 10,
}: {
  query: string
  sort?: "stars" | "forks" | "help-wanted-issues" | "updated"
  order?: "asc" | "desc"
  perPage?: number
}): Promise<RepoSearchResult[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }

  const response = await octokit.rest.search.repos({
    q: query,
    sort,
    order,
    per_page: perPage,
  })

  return response.data.items.map((repo) => ({
    fullName: repo.full_name,
    description: repo.description,
    stargazersCount: repo.stargazers_count,
    url: repo.html_url,
  }))
}

export interface RepoWithIssues {
  fullName: string
  description: string | null
  stargazersCount: number
  url: string
  issues: GitHubIssue[]
}

export interface SearchReposParams {
  topic?: string
  maxStars?: number
  minStars?: number
  language?: string
  issueLabel?: string
  state?: "open" | "closed" | "all"
  perPage?: number
  page?: number
  createdAfter?: string // ISO date string
  createdBefore?: string // ISO date string
  sort?: "created" | "updated" | "comments"
  order?: "asc" | "desc"
}

export async function searchReposWithIssuesGraphQL({
  topic,
  maxStars,
  minStars = 0,
  language,
  issueLabel,
  state = "OPEN",
  perPage = 10,
  page = 1,
  createdAfter,
  createdBefore,
  sort = "CREATED_AT",
  order = "DESC",
}: SearchReposWithIssuesParams): Promise<SearchReposWithIssuesResult> {
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  // Construct repository search query
  let searchQuery = topic ? `topic:${topic}` : ""
  if (language) searchQuery += ` language:${language}`
  if (maxStars) searchQuery += ` stars:<=${maxStars}`
  if (minStars) searchQuery += ` stars:>=${minStars}`

  // Construct the GraphQL query
  const query = `
    query SearchReposWithIssues(
      $searchQuery: String!,
      $perPage: Int!,
      $cursor: String,
      $state: [IssueState!],
      $labels: [String!],
      $createdAfter: DateTime,
      $orderField: IssueOrderField!,
      $orderDirection: OrderDirection!
    ) {
      search(query: $searchQuery, type: REPOSITORY, first: $perPage, after: $cursor) {
        repositoryCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on Repository {
            nameWithOwner
            description
            stargazerCount
            url
            issues(
              first: 100
              states: $state
              labels: $labels
              filterBy: { since: $createdAfter }
              orderBy: { field: $orderField, direction: $orderDirection }
            ) {
              totalCount
              nodes {
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
                user: author {
                  login
                }
              }
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
    state: [state],
    labels: issueLabel ? [issueLabel] : null,
    createdAfter: createdAfter || null,
    orderField: sort,
    orderDirection: order,
  }

  try {
    const response = await graphqlWithAuth<GraphQLSearchResponse>(
      query,
      variables
    )

    return {
      repos: response.search.nodes.map((repo) => ({
        fullName: repo.nameWithOwner,
        description: repo.description,
        stargazersCount: repo.stargazerCount,
        url: repo.url,
        issues: repo.issues.nodes.map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          url: issue.url,
          comments: issue.comments.totalCount,
          labels: issue.labels.nodes.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          })),
          user: {
            login: issue.user.login,
          },
        })),
      })),
      totalReposFound: response.search.repositoryCount,
      reposWithoutIssues: response.search.nodes.filter(
        (repo) => repo.issues.totalCount === 0
      ).length,
      hasNextPage: response.search.pageInfo.hasNextPage,
      page,
    }
  } catch (error) {
    console.error("Error searching repositories:", error)
    throw error
  }
}
