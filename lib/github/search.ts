"use server"

import getOctokit from "@/lib/github"
import { getIssueList } from "@/lib/github/issues"
import { GitHubIssue, SearchCodeItem } from "@/lib/types/github"

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

export interface SearchReposWithIssuesResult {
  repos: RepoWithIssues[]
  totalReposFound: number
  reposWithoutIssues: number
  hasNextPage: boolean
  page: number
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
}

export async function searchReposWithIssues({
  topic,
  maxStars,
  minStars = 0,
  language,
  issueLabel,
  state = "open",
  perPage = 10,
  page = 1,
}: SearchReposParams): Promise<SearchReposWithIssuesResult> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }

  try {
    // Construct repository search query
    let searchQuery = `topic:${topic}`
    if (language) searchQuery += ` language:${language}`
    if (maxStars) searchQuery += ` stars:<=${maxStars}`
    if (minStars) searchQuery += ` stars:>=${minStars}`

    // Search for repositories
    const repoResponse = await octokit.rest.search.repos({
      q: searchQuery,
      sort: "stars",
      order: "desc",
      per_page: perPage,
      page,
    })

    // For each repository, fetch issues with the specified label
    const reposWithIssues = await Promise.all(
      repoResponse.data.items.map(async (repo) => {
        try {
          const issues = await getIssueList({
            repoFullName: repo.full_name,
            state,
            labels: issueLabel,
            per_page: 100,
          })

          return {
            fullName: repo.full_name,
            description: repo.description,
            stargazersCount: repo.stargazers_count,
            url: repo.html_url,
            issues,
          }
        } catch (error) {
          console.error(`Error fetching issues for ${repo.full_name}:`, error)
          return {
            fullName: repo.full_name,
            description: repo.description,
            stargazersCount: repo.stargazers_count,
            url: repo.html_url,
            issues: [],
          }
        }
      })
    )

    const reposWithMatchingIssues = reposWithIssues.filter(
      (repo) => repo.issues.length > 0
    )
    const reposWithoutIssues =
      reposWithIssues.length - reposWithMatchingIssues.length

    return {
      repos: reposWithMatchingIssues,
      totalReposFound: repoResponse.data.total_count,
      reposWithoutIssues,
      hasNextPage: page * perPage < repoResponse.data.total_count,
      page,
    }
  } catch (error) {
    console.error("Error searching repositories:", error)
    throw error
  }
}
