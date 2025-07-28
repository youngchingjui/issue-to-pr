"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listUserAppRepositories } from "@/lib/github/repos"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { RepoSelectorItem } from "@/lib/types/github"

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
}

export default function RepoSelector({ selectedRepo }: Props) {
  const router = useRouter()
  const [repos, setRepos] = useState<RepoSelectorItem[]>([])
  // Start in loading state because we immediately fetch on mount
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("md")

  // Fetch repositories as soon as the component mounts so we can
  // decide whether to show the repo dropdown or the installation CTA.
  useEffect(() => {
    listUserAppRepositories()
      .then((data) => setRepos(data))
      .finally(() => setLoading(false))
  }, [])

  // Still allow refetching when the dropdown is opened for the first time
  // in case something went wrong in the initial fetch.
  useEffect(() => {
    if (open && repos.length === 0 && !loading) {
      setLoading(true)
      listUserAppRepositories()
        .then((data) => setRepos(data))
        .finally(() => setLoading(false))
    }
    // We intentionally omit `repos.length` here to avoid refetching on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 1. Loading state
  if (loading) {
    return <div className="px-4 py-2">Loading...</div>
  }

  // 2. No repositories detected – show GitHub App installation CTA
  if (!loading && repos.length === 0) {
    return (
      <Button asChild variant="secondary">
        <Link href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
          Install Issue&nbsp;to&nbsp;PR to get started
        </Link>
      </Button>
    )
  }

  // 3. Repositories available – show repo selector dropdown
  return (
    <Select
      defaultValue={selectedRepo}
      name="repo"
      onValueChange={(val) => {
        router.push(`/issues?repo=${encodeURIComponent(val)}`)
      }}
      onOpenChange={setOpen}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select repository">
          {selectedRepo}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align={isDesktop ? "end" : "start"}>
        {loading && <div className="px-4 py-2">Loading...</div>}
        {!loading &&
          repos.map((repo) => (
            <SelectItem key={repo.full_name} value={repo.full_name}>
              {repo.full_name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
