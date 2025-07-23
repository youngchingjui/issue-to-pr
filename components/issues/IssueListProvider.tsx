"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

import { getIssueListWithStatus } from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

// The Issue type returned from getIssueListWithStatus
// We deliberately use `any` to avoid tight coupling with the GitHub API types
// so that this context can evolve independently without breaking the build
export type Issue = Awaited<ReturnType<typeof getIssueListWithStatus>>[number]

interface IssueListContextValue {
  issues: Issue[]
  loading: boolean
  error: string | null
  /**
   * Re-fetch the issues from the server. Components can call this after they
   * make a change (e.g. creating a new GitHub issue) to keep the local list in
   * sync.
   */
  refresh: () => Promise<void>
}

const IssueListContext = createContext<IssueListContextValue | null>(null)

interface ProviderProps {
  repoFullName: RepoFullName
  children: React.ReactNode
  /**
   * Maximum number of issues to fetch. Defaults to 25 to match previous
   * behaviour.
   */
  perPage?: number
}

export function IssueListProvider({
  repoFullName,
  children,
  perPage = 25,
}: ProviderProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getIssueListWithStatus({
        repoFullName: repoFullName.fullName,
        per_page: perPage,
      })
      setIssues(data)
      setError(null)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [repoFullName.fullName, perPage])

  useEffect(() => {
    // Initial fetch when the provider mounts
    fetchIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want to run once
  }, [])

  const value: IssueListContextValue = {
    issues,
    loading,
    error,
    refresh: fetchIssues,
  }

  return <IssueListContext.Provider value={value}>{children}</IssueListContext.Provider>
}

export function useIssueList() {
  const context = useContext(IssueListContext)
  if (!context) {
    throw new Error("useIssueList must be used within an IssueListProvider")
  }
  return context
}

