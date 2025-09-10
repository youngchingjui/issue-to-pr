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
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full md:w-60" />
      </div>
    )
  }

  return (
    <BranchSelector
      value={branch ?? undefined}
      onChange={setBranch}
      selectedRepo={repoFullName}
    />
  )
}

