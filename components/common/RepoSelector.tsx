"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listUserRepositoriesGraphQL } from "@/lib/github/users"
import { RepoSelectorItem } from "@/lib/types/github"

interface Props {
  selectedRepo: string
}

export default function RepoSelector({ selectedRepo }: Props) {
  const router = useRouter()
  const [repos, setRepos] = useState<RepoSelectorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open && repos.length === 0 && !loading) {
      setLoading(true)
      listUserRepositoriesGraphQL()
        .then((data) => setRepos(data))
        .finally(() => setLoading(false))
    }
  }, [open, repos.length, loading])

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
      <SelectContent>
        {loading && <div className="px-4 py-2">Loading...</div>}
        {!loading &&
          repos.map((repo) => (
            <SelectItem key={repo.nameWithOwner} value={repo.nameWithOwner}>
              {repo.nameWithOwner}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
