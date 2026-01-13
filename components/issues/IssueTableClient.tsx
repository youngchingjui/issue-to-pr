"use client"

import { useEffect, useMemo, useState } from "react"

import IssuesList from "@/components/issues/IssuesList"
import RowsSkeleton from "@/components/issues/RowsSkeleton"
import { Table, TableBody } from "@/components/ui/table"
import { listIssues } from "@/lib/actions/issues"
import type { IssueWithStatus } from "@/lib/github/issues"
import type { RepoFullName } from "@/lib/types/github"

import { useOptimisticIssues } from "./OptimisticIssueProvider"

interface Props {
  repoFullName: RepoFullName
}

function mergeIssues(
  optimisticIssues: IssueWithStatus[],
  fetchedIssues: IssueWithStatus[]
): IssueWithStatus[] {
  if (optimisticIssues.length === 0) return fetchedIssues

  const fetchedNumbers = new Set(fetchedIssues.map((issue) => issue.number))
  const filteredOptimistic = optimisticIssues.filter(
    (issue) => !fetchedNumbers.has(issue.number)
  )

  return [...filteredOptimistic, ...fetchedIssues]
}

export default function IssueTableClient({ repoFullName }: Props) {
  const [issues, setIssues] = useState<IssueWithStatus[]>([])
  const [prMap, setPrMap] = useState<Record<number, number | null>>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const optimisticContext = useOptimisticIssues()
  const optimisticIssues = optimisticContext?.optimisticIssues ?? []

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

  useEffect(() => {
    if (!optimisticContext) return
    if (optimisticIssues.length === 0 || issues.length === 0) return
    const fetchedNumbers = new Set(issues.map((issue) => issue.number))
    optimisticIssues.forEach((issue) => {
      if (fetchedNumbers.has(issue.number)) {
        optimisticContext.removeOptimisticIssue(issue.number)
      }
    })
  }, [issues, optimisticIssues, optimisticContext])

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

  const mergedIssues = useMemo(
    () => mergeIssues(optimisticIssues, issues),
    [optimisticIssues, issues]
  )

  return (
    <div className="rounded-md border">
      <Table className="table-fixed sm:table-auto">
        <TableBody>
          {initialLoading ? (
            <RowsSkeleton rows={5} columns={3} />
          ) : (
            <IssuesList
              repoFullName={repoFullName.fullName}
              issues={mergedIssues}
              prMap={prMap}
              loading={loading}
              error={error}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
            />
          )}
        </TableBody>
      </Table>
    </div>
  )
}
