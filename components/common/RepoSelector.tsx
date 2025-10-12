"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listUserAppRepositories } from "@/lib/github/repos"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { AuthenticatedUserRepository } from "@/lib/types/github"

// Determine which GitHub App slug to use based on environment.
// 1. Prefer an explicit build-time env var (exposed to the browser) so deployments can override.
// 2. Fallback to NODE_ENV (prod = production app, anything else = dev app).
const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG

if (!GITHUB_APP_SLUG) {
  throw new Error("NEXT_PUBLIC_GITHUB_APP_SLUG is not set")
}

const INSTALL_URL = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`

interface Props {
  selectedRepo: string
  repositories?: AuthenticatedUserRepository[]
}

// TODO: Not quite sure this data fetching is all necessary. Need to revisit and consider how to best fetch data here.
// In conjunction with the pages that use this component.
export default function RepoSelector({
  selectedRepo,
  repositories: initialRepositories,
}: Props) {
  const router = useRouter()
  const [repos, setRepos] = useState<AuthenticatedUserRepository[]>(
    initialRepositories || []
  )
  // Only start in loading state if repositories weren't provided
  const [loading, setLoading] = useState(!initialRepositories)
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("md")

  // Local selected value so the UI updates immediately on user choice
  const [value, setValue] = useState<string>(selectedRepo)
  useEffect(() => setValue(selectedRepo), [selectedRepo])

  // Search query state
  const [query, setQuery] = useState("")

  // Only fetch repositories if they weren't provided as props
  useEffect(() => {
    if (!initialRepositories) {
      listUserAppRepositories()
        .then((data) => setRepos(data))
        .finally(() => setLoading(false))
    }
  }, [initialRepositories])

  // Still allow refetching when the dropdown is opened for the first time
  // in case something went wrong in the initial fetch (only when no initial repositories provided).
  useEffect(() => {
    if (open && repos.length === 0 && !loading && !initialRepositories) {
      setLoading(true)
      listUserAppRepositories()
        .then((data) => setRepos(data))
        .finally(() => setLoading(false))
    }
    // We intentionally omit `repos.length` here to avoid refetching on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRepositories])

  // Reset query when dropdown is closed
  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? repos.filter((r) => r.full_name.toLowerCase().includes(q))
      : repos
  }, [query, repos])

  // Ensure that the currently selected repository is always present in the list.
  // When it vanishes due to a search filter Radix re-calculates focus which causes
  // the <Input> to lose focus (mobile keyboards collapse). By force-including the
  // selected repo we keep the internal focus management stable.
  const visibleRepos = useMemo(() => {
    if (filteredRepos.some((r) => r.full_name === value)) {
      return filteredRepos
    }

    const selectedEntry = repos.find((r) => r.full_name === value)
    if (!selectedEntry) {
      return filteredRepos
    }

    // Prepend to avoid changing the relative ordering of the filtered list.
    return [selectedEntry, ...filteredRepos]
  }, [filteredRepos, repos, value])

  // 1. Loading state
  if (loading) {
    return <div className="px-4 py-2">Loading...</div>
  }

  // 2. No repositories detected – show GitHub App installation CTA
  if (!loading && repos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button asChild variant="secondary">
          <Link href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
            Install Issue&nbsp;to&nbsp;PR to get started
          </Link>
        </Button>
        <Button asChild variant="link" className="p-0 h-auto text-sm">
          <Link href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
            Manage repositories
          </Link>
        </Button>
      </div>
    )
  }

  // 3. Repositories available – show repo selector dropdown
  return (
    <Select
      value={value}
      name="repo"
      onValueChange={(val) => {
        if (val === value) {
          setOpen(false)
          return
        }
        // Update UI instantly so the user sees their selection immediately
        setValue(val)
        setOpen(false)
        // Then perform navigation
        router.push(`/issues?repo=${encodeURIComponent(val)}`)
        // Consider: router.replace(...) if you don't want back button to step through every selection.
      }}
      onOpenChange={setOpen}
    >
      <SelectTrigger className="w-auto max-w-[90vw] md:w-64">
        <SelectValue placeholder="Select repository" />
      </SelectTrigger>
      <SelectContent align={isDesktop ? "end" : "start"}>
        {/* Search input */}
        <div className="p-1 sticky top-0 bg-popover z-10">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories..."
            // Auto focus when dropdown opens
            autoFocus
            className="h-8 text-sm"
            // Prevent Radix Select typeahead from closing the dropdown on key presses.
            onKeyDown={(e) => e.stopPropagation()}
            // On mobile, some browsers emit pointer events that can bubble up and close the menu.
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        {loading && <div className="px-4 py-2">Loading...</div>}
        {!loading &&
          visibleRepos.map((repo) => (
            <SelectItem key={repo.full_name} value={repo.full_name}>
              {repo.full_name}
            </SelectItem>
          ))}
        {!loading && visibleRepos.length > 0 && (
          <div className="my-1 border-t border-border/40" />
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
            Manage repositories
          </Link>
        </Button>
      </SelectContent>
    </Select>
  )
}

