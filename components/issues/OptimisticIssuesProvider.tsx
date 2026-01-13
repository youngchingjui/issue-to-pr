"use client"

import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type OptimisticIssue = {
  id: number
  number: number
  title: string
  state: string
  updated_at: string
  user: { login: string } | null
  hasActiveWorkflow: boolean
  activeWorkflowId?: string | null
  hasPlan: boolean
  planId?: string | null
}

type OptimisticIssuesContextValue = {
  optimisticIssues: OptimisticIssue[]
  addOptimisticIssue: (issue: OptimisticIssue) => void
  clearOptimisticIssues: () => void
}

const OptimisticIssuesContext =
  createContext<OptimisticIssuesContextValue | null>(null)

export function OptimisticIssuesProvider({
  repoFullName,
  children,
}: {
  repoFullName: string
  children: ReactNode
}) {
  const [optimisticIssues, setOptimisticIssues] = useState<OptimisticIssue[]>([])

  useEffect(() => {
    setOptimisticIssues([])
  }, [repoFullName])

  const addOptimisticIssue = useCallback((issue: OptimisticIssue) => {
    setOptimisticIssues((prev) => {
      const withoutDuplicate = prev.filter((i) => i.number !== issue.number)
      return [issue, ...withoutDuplicate]
    })
  }, [])

  const clearOptimisticIssues = useCallback(() => {
    setOptimisticIssues([])
  }, [])

  const value = useMemo(
    () => ({ optimisticIssues, addOptimisticIssue, clearOptimisticIssues }),
    [optimisticIssues, addOptimisticIssue, clearOptimisticIssues]
  )

  return (
    <OptimisticIssuesContext.Provider value={value}>
      {children}
    </OptimisticIssuesContext.Provider>
  )
}

export function useOptimisticIssues() {
  const ctx = useContext(OptimisticIssuesContext)
  if (!ctx) {
    throw new Error(
      "useOptimisticIssues must be used within an OptimisticIssuesProvider"
    )
  }
  return ctx
}
