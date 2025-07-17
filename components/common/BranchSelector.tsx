"use client"

import { useEffect, useRef, useState } from "react"

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
import {
  getRepositoryBranches,
  getRepositoryDefaultBranch,
} from "@/lib/actions/github"

interface BranchSelectorProps {
  repoFullName: string
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
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState("")
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Reset state when repo changes
  useEffect(() => {
    setBranches([])
    setPage(1)
    setHasMore(true)
  }, [repoFullName])

  // Load default branch on repo change
  useEffect(() => {
    if (!repoFullName) return
    getRepositoryDefaultBranch(repoFullName).then((d) => {
      setDefaultBranch(d)
      // initialize selected branch if not set
      if (!value) onChange(d)
    })
  }, [repoFullName])

  // Fetch branches for current page
  useEffect(() => {
    if (!open || !repoFullName || !hasMore || loading) return
    setLoading(true)
    getRepositoryBranches(repoFullName, PAGE_SIZE, page)
      .then((names) => {
        if (names.length < PAGE_SIZE) setHasMore(false)
        setBranches((prev) => [...prev, ...names])
      })
      .finally(() => setLoading(false))
  }, [open, repoFullName, page, hasMore, loading])

  // Scroll observer for lazy loading
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handleScroll = () => {
      if (loading || !hasMore) return
      const threshold = 40
      if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
        setPage((p) => p + 1)
      }
    }
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore])

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
        <SelectContent ref={contentRef as any}>
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

