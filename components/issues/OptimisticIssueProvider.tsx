"use client"

import { createContext, useContext, useMemo, useState } from "react"

import type { IssueWithStatus } from "@/lib/github/issues"

interface OptimisticIssueContextValue {
  optimisticIssues: IssueWithStatus[]
  addOptimisticIssue: (issue: IssueWithStatus) => void
  removeOptimisticIssue: (issueNumber: number) => void
  clearOptimisticIssues: () => void
}

const OptimisticIssueContext = createContext<OptimisticIssueContextValue | null>(
  null
)

export function OptimisticIssueProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [optimisticIssues, setOptimisticIssues] = useState<IssueWithStatus[]>(
    []
  )

  const value = useMemo<OptimisticIssueContextValue>(
    () => ({
      optimisticIssues,
      addOptimisticIssue: (issue) => {
        setOptimisticIssues((prev) => [issue, ...prev])
      },
      removeOptimisticIssue: (issueNumber) => {
        setOptimisticIssues((prev) =>
          prev.filter((issue) => issue.number !== issueNumber)
        )
      },
      clearOptimisticIssues: () => {
        setOptimisticIssues([])
      },
    }),
    [optimisticIssues]
  )

  return (
    <OptimisticIssueContext.Provider value={value}>
      {children}
    </OptimisticIssueContext.Provider>
  )
}

export function useOptimisticIssues() {
  return useContext(OptimisticIssueContext)
}
