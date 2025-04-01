"use client"

import { components } from "@octokit/openapi-types"
import Link from "next/link"
import { useState } from "react"

import { IssueSearch } from "@/components/issues/issue-search"
import { SearchParams } from "@/lib/actions/search-issues"
import { GitHubIssue } from "@/lib/types/github"

type Label = components["schemas"]["label"]

interface RepoIssues {
  fullName: string
  description: string | null
  stargazersCount: number
  url: string
  issues: GitHubIssue[]
}

interface IssueExplorerProps {
  searchAction: (params: SearchParams) => Promise<RepoIssues[]>
}

export function IssueExplorer({ searchAction }: IssueExplorerProps) {
  const [repos, setRepos] = useState<RepoIssues[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (params: SearchParams) => {
    setLoading(true)
    setError(null)

    try {
      const results = await searchAction(params)
      setRepos(results)
    } catch (err) {
      setError("Failed to fetch repositories and issues. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <IssueSearch
        onSearch={handleSearch}
        defaultValues={{
          topic: "nextjs",
          language: "typescript",
          issueLabel: "bug",
          state: "open",
        }}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            Searching repositories and issues...
          </p>
        </div>
      )}

      <div className="space-y-8">
        {repos.map((repo) => (
          <div
            key={repo.fullName}
            className="border rounded-lg overflow-hidden"
          >
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {repo.fullName}
                  </a>
                </h2>
                <span className="text-gray-500">⭐ {repo.stargazersCount}</span>
              </div>
              {repo.description && (
                <p className="mt-2 text-gray-600">{repo.description}</p>
              )}
            </div>

            <div className="divide-y">
              {repo.issues.map((issue) => (
                <div key={issue.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      <Link
                        href={`/${repo.fullName.split("/")[0]}/${repo.fullName.split("/")[1]}/issues/${issue.number}`}
                        className="text-blue-600 hover:underline"
                      >
                        {issue.title}
                      </Link>
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        issue.state === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {issue.state}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    #{issue.number} opened by {issue.user?.login}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {issue.labels.map((label: Label) => (
                      <span
                        key={label.id}
                        className="px-2 py-1 text-xs rounded-full bg-gray-100"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && repos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No repositories found with matching issues. Try adjusting your
            search criteria.
          </div>
        )}
      </div>
    </div>
  )
}
