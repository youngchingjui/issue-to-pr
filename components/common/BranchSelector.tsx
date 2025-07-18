"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getRepositoryBranches } from "@/lib/actions/github"
import { RepoFullName } from "@/lib/types/github"

interface BranchSelectorProps {
  repoFullName: RepoFullName
  value: string
  onChange: (value: string) => void
}

const PAGE_SIZE = 25

export default function BranchSelector({
  repoFullName,
  value,
  onChange,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [defaultBranch, setDefaultBranch] = useState<string>("main")
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  // Reset state when repo changes
  useEffect(() => {
    setBranches([])
  }, [repoFullName])

  // Fetch branches for current page
  useEffect(() => {
    if (!open || !repoFullName || loading || branches.length > 0) return
    setLoading(true)
    getRepositoryBranches(repoFullName.fullName, PAGE_SIZE, 1)
      .then((names) => setBranches(names))
      .finally(() => setLoading(false))
  }, [open, repoFullName, loading, branches.length])

  const filtered = branches.filter((b) =>
    b.toLowerCase().includes(search.toLowerCase())
  )

  const otherBranches = filtered.filter((b) => b !== defaultBranch)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="branch-selector" className="text-sm">
        Launch from
      </Label>
      <Select value={value} onValueChange={onChange} onOpenChange={setOpen}>
        <SelectTrigger id="branch-selector" className="w-full md:w-60">
          <SelectValue placeholder="Select branch, tag or commit" />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-2 sticky top-0 bg-popover z-10">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          {defaultBranch && (
            <SelectItem value={defaultBranch}>{defaultBranch}</SelectItem>
          )}
          {otherBranches.length > 0 && <SelectSeparator />}
          {otherBranches.map((branch) => (
            <SelectItem key={branch} value={branch} className="capitalize">
              {branch}
            </SelectItem>
          ))}
          {loading && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              Loading...
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
