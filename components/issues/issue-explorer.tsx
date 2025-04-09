"use client"

import Link from "next/link"
import { useState } from "react"

import { IssueSearch } from "@/components/issues/issue-search"
import {
  searchAllIssuesGraphQL,
  SearchIssuesResult,
  SearchReposWithIssuesParams,
} from "@/lib/github/search"

export function IssueExplorer() {
  const [searchResult, setSearchResult] = useState<SearchIssuesResult | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchParams, setSearchParams] =
    useState<SearchReposWithIssuesParams | null>(null)

  const handleSearch = async (params: SearchReposWithIssuesParams) => {
    setLoading(true)
    setError(null)
    setCurrentPage(1)
    setSearchParams(params)

    try {
      const results = await searchAllIssuesGraphQL({ ...params, page: 1 })
      setSearchResult(results)
    } catch (err) {
      setError("Failed to fetch issues. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!searchParams || !searchResult?.hasNextPage) return

    setLoading(true)
    const nextPage = currentPage + 1

    try {
      const results = await searchAllIssuesGraphQL({
        ...searchParams,
        page: nextPage,
      })
      setSearchResult((prev) =>
        prev
          ? {
              ...results,
              issues: [...prev.issues, ...results.issues],
            }
          : results
      )
      setCurrentPage(nextPage)
    } catch (err) {
      setError("Failed to load more results. Please try again.")
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
          language: "typescript",
          state: "OPEN",
          sort: "CREATED",
          order: "DESC",
        }}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading && !searchResult?.issues.length && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Searching issues...</p>
        </div>
      )}

      {searchResult && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Found {searchResult.totalIssuesFound} issues matching your criteria.
          </div>

          <div className="space-y-4">
            {searchResult.issues.map((issue) => (
              <div
                key={issue.id}
                className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium">
                        <Link
                          href={`/${issue.repository.nameWithOwner.split("/")[0]}/${
                            issue.repository.nameWithOwner.split("/")[1]
                          }/issues/${issue.number}`}
                          className="text-blue-600 hover:underline"
                        >
                          {issue.title}
                        </Link>
                      </h3>
                      <div className="text-sm text-gray-500">
                        <a
                          href={issue.repository.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {issue.repository.nameWithOwner}
                        </a>{" "}
                        • ⭐ {issue.repository.stargazersCount}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        issue.state.toLowerCase() === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {issue.state.toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-500 space-x-4">
                    <span>
                      #{issue.number} opened by {issue.author.login}
                    </span>
                    <span>
                      Created: {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      Last updated:{" "}
                      {new Date(issue.updatedAt).toLocaleDateString()}
                    </span>
                    <span>{issue.comments} comments</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {issue.labels.map((label) => (
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
              </div>
            ))}
          </div>

          {searchResult.hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Load More Results"}
              </button>
            </div>
          )}

          {!loading && searchResult.issues.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No issues found matching your search criteria. Try adjusting your
              search parameters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
