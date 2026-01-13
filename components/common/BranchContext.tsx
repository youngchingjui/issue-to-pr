"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

interface BranchContextValue {
  branch?: string
  setBranch: React.Dispatch<React.SetStateAction<string | undefined>>
  repoFullName: string
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined)
BranchContext.displayName = "BranchContext"

interface ProviderProps {
  repoFullName: string
  defaultBranch?: string | null
  children: React.ReactNode
}

export function RepoBranchProvider({
  repoFullName,
  defaultBranch,
  children,
}: ProviderProps) {
  const [branch, setBranch] = useState<string | undefined>(
    defaultBranch ?? undefined
  )

  const value = useMemo(
    () => ({ branch, setBranch, repoFullName }),
    [branch, repoFullName]
  )

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useSelectedBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) {
    throw new Error("useSelectedBranch must be used within RepoBranchProvider")
  }
  return ctx
}

export function useBranchContext() {
  return useContext(BranchContext)
}

