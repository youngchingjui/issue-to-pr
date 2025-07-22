"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listBranchesSortedByCommitDate } from "@/lib/github/refs"
import { repoFullNameSchema } from "@/lib/types/github"

interface BranchSelectorProps {
  value: string
  onChange: (value: string) => void
  selectedRepo?: string
  disabled?: boolean
}

export default function BranchSelector({
  value,
  onChange,
  selectedRepo,
  disabled = false,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch branches when a repo is selected
  useEffect(() => {
    if (!selectedRepo) {
      setBranches([])
      return
    }

    setLoading(true)
    const loadBranches = async () => {
      try {
        const branchData = await listBranchesSortedByCommitDate(
          repoFullNameSchema.parse(selectedRepo)
        )
        setBranches(branchData.map((b) => b.name))
      } catch (error) {
        console.error("Failed to load branches:", error)
        setBranches([])
      } finally {
        setLoading(false)
      }
    }

    loadBranches()
  }, [selectedRepo])

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="branch-selector" className="text-sm">
        Launch from
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || loading || !selectedRepo}
      >
        <SelectTrigger id="branch-selector" className="w-full md:w-60">
          <SelectValue
            placeholder={
              !selectedRepo
                ? "Select a repository first"
                : loading
                  ? "Loading branches..."
                  : "Select branch, tag or commit"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {loading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading branches...
            </div>
          )}
          {!loading && branches.length === 0 && selectedRepo && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No branches found
            </div>
          )}
          {branches.map((branch) => (
            <SelectItem key={branch} value={branch} className="capitalize">
              {branch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <p className="text-sm text-muted-foreground">Loading branches...</p>
      )}
    </div>
  )
}
