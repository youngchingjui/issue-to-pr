"use client"

import { useEffect, useState } from "react"

import IssueRow from "@/components/issues/IssueRow"
import PRStatusIndicator from "@/components/issues/PRStatusIndicator"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  repoFullName: string
  perPage?: number
}

export default function LoadMoreIssues({ repoFullName, perPage = 25 }: Props) {
  const [page, setPage] = useState(1) // initial server rendered page is 1; next fetch will be 2
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueWithStatus[]>([])
  const [prMap, setPrMap] = useState<Record<number, number | null>>({})
  const [hasMore, setHasMore] = useState<boolean | null>(null)
  const [hasAnyInitialIssues, setHasAnyInitialIssues] = useState<
    boolean | null
  >(null)

  // Check if there are any issues on initial page so we don't render button when list is empty
  useEffect(() => {
    const ctrl = new AbortController()
    const checkInitial = async () => {
      try {
        const resp = await fetch("/api/issues/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoFullName, page: 1, per_page: perPage }),
          signal: ctrl.signal,
        })
        if (!resp.ok) {
          throw new Error(`Failed to check initial issues: ${resp.status}`)
        }
        const data: {
          issues: IssueWithStatus[]
          prMap: Record<number, number | null>
          hasMore: boolean
        } = await resp.json()
        setHasAnyInitialIssues(data.issues.length > 0)
        // If server says there aren't more after page 1, reflect that so we can hide button up front.
        setHasMore(data.hasMore)
      } catch {
        // ignore errors; leave as null so UX can still attempt loading
        setHasAnyInitialIssues(true)
      }
    }
    checkInitial()
    return () => {
      ctrl.abort()
    }
  }, [repoFullName, perPage])

  const loadMore = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const nextPage = page + 1
      const resp = await fetch("/api/issues/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName,
          page: nextPage,
          per_page: perPage,
        }),
      })
      if (!resp.ok) {
        throw new Error(`Failed to load issues: ${resp.status}`)
      }
      const data: {
        issues: IssueWithStatus[]
        prMap: Record<number, number | null>
        hasMore: boolean
      } = await resp.json()

      setIssues((prev) => [...prev, ...data.issues])
      setPrMap((prev) => ({ ...prev, ...data.prMap }))
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Don't show the button until we know whether there are any issues at all.
  // If we already determined there are no more, hide the button.
  const showButton = hasAnyInitialIssues === true && hasMore !== false

  return (
    <>
      {issues.map((issue) => (
        <IssueRow
          key={`issue-more-${issue.id}`}
          issue={issue}
          repoFullName={repoFullName}
          prSlot={
            <PRStatusIndicator
              repoFullName={repoFullName}
              prNumber={prMap[issue.number]}
            />
          }
        />
      ))}

      {error && (
        <TableRow>
          <TableCell colSpan={3} className="text-red-600">
            {error}
          </TableCell>
        </TableRow>
      )}

      {showButton && (
        <TableRow>
          <TableCell colSpan={3} className="text-center py-4">
            <Button onClick={loadMore} disabled={loading} variant="outline">
              {loading ? "Loading..." : "Load more"}
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
