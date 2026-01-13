"use client"

import { useSelectedBranch } from "@/components/common/BranchContext"
import BranchSelector from "@/components/common/BranchSelector"

export default function BranchSelectorControl() {
  const { branch, setBranch, repoFullName } = useSelectedBranch()

  return (
    <BranchSelector
      value={branch ?? undefined}
      onChange={setBranch}
      selectedRepo={repoFullName}
    />
  )
}
