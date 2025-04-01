"use server"

import getOctokit from "@/lib/github"
import { getIssueList } from "@/lib/github/issues"
import { GitHubIssue } from "@/lib/types/github"

interface RepoWithIssues {
  fullName: string
  description: string | null
  stargazersCount: number
  url: string
  issues: GitHubIssue[]
}

export interface SearchParams {
  topic?: string
  maxStars?: number
  minStars?: number
  language?: string
  issueLabel?: string
  state?: "open" | "closed" | "all"
  perPage?: number
}

export async function searchReposWithIssues({
  topic = "nextjs",
  maxStars,
  minStars = 0,
  language,
  issueLabel = "bug",
  state = "open",
  perPage = 10,
}: SearchParams): Promise<RepoWithIssues[]> {
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

    // Filter out repositories with no issues
    return reposWithIssues.filter((repo) => repo.issues.length > 0)
  } catch (error) {
    console.error("Error searching repositories:", error)
    throw error
  }
}
