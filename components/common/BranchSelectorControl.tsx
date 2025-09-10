"use client"

import { useSelectedBranch } from "@/components/common/BranchContext"
import BranchSelector from "@/components/common/BranchSelector"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  showSkeleton?: boolean
}

export default function BranchSelectorControl({ showSkeleton = false }: Props) {
  const { branch, setBranch, repoFullName } = useSelectedBranch()

  // While repoFullName is required, keep an optional skeleton hook for future use
  if (showSkeleton && !repoFullName) {
    return <Skeleton className="h-9 w-60" />
  }

  return (
    <BranchSelector
      value={branch ?? ""}
      onChange={setBranch}
      selectedRepo={repoFullName}
    />
  )
}

