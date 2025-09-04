"use client"

import { Suspense, useEffect, useState } from "react"

import RepoSelector from "@/components/common/RepoSelector"
import IssuesList from "@/components/issues/IssuesList"
import NewTaskInput from "@/components/issues/NewTaskInput"
import RowsSkeleton from "@/components/issues/RowsSkeleton"
import { Table, TableBody } from "@/components/ui/table"
import { listIssues } from "@/lib/actions/issues"
import type { IssueWithStatus } from "@/lib/github/issues"
import type {
  AuthenticatedUserRepository,
  RepoFullName,
} from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
  repositories: AuthenticatedUserRepository[]
  issuesEnabled: boolean
}

export default function IssueDashboardClient({
  repoFullName,
  repositories,
  issuesEnabled,
}: Props) {
  const [issues, setIssues] = useState<IssueWithStatus[]>([])
  const [prMap, setPrMap] = useState<Record<number, number | null>>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadInitial() {
      setInitialLoading(true)
      setError(null)
      try {
        const data = await listIssues({
          repoFullName: repoFullName.fullName,
          page: 1,
          per_page: 25,
        })
        if (cancelled) return
        setIssues(data.issues)
        setPrMap(data.prMap)
        setHasMore(data.hasMore)
        setPage(1)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load issues")
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    }
    loadInitial()
    return () => {
      cancelled = true
    }
  }, [repoFullName.fullName])

  const onLoadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const nextPage = page + 1
      const data = await listIssues({
        repoFullName: repoFullName.fullName,
        page: nextPage,
        per_page: 25,
      })
      setIssues((prev) => [...prev, ...data.issues])
      setPrMap((prev) => ({ ...prev, ...data.prMap }))
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more issues")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl w-full py-10 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <RepoSelector
            selectedRepo={repoFullName.fullName}
            repositories={repositories}
          />
        </div>
      </div>

      {!issuesEnabled ? (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="mb-1 font-medium">
            GitHub Issues are disabled for this repository.
          </p>
          <p>
            To enable issues, visit the repository settings on GitHub and turn
            on the Issues feature.{" "}
            <a
              href={`https://github.com/${repoFullName.owner}/${repoFullName.repo}/settings#features`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open GitHub settings
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <NewTaskInput
          repoFullName={repoFullName}
          issuesEnabled={issuesEnabled}
        />
      </div>

      {issuesEnabled ? (
        <div className="rounded-md border">
          <Table className="table-fixed sm:table-auto">
            <TableBody>
              <Suspense fallback={<RowsSkeleton rows={5} columns={3} />}>
                {initialLoading ? (
                  <RowsSkeleton rows={5} columns={3} />
                ) : (
                  <IssuesList
                    repoFullName={repoFullName.fullName}
                    issues={issues}
                    prMap={prMap}
                    loading={loading}
                    error={error}
                    hasMore={hasMore}
                    onLoadMore={onLoadMore}
                  />
                )}
              </Suspense>
            </TableBody>
          </Table>
        </div>
      ) : null}
    </main>
  )
}
