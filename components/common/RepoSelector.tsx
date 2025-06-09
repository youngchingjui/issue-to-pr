"use client"

import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GitHubRepository } from "@/lib/types/github"

interface Props {
  repos: GitHubRepository[]
  selectedRepo: string
}

export default function RepoSelector({ repos, selectedRepo }: Props) {
  const router = useRouter()
  return (
    <Select
      defaultValue={selectedRepo}
      name="repo"
      onValueChange={(val) => {
        router.push(`/issues?repo=${encodeURIComponent(val)}`)
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select repository" />
      </SelectTrigger>
      <SelectContent>
        {repos.map((repo) => (
          <SelectItem key={repo.full_name} value={repo.full_name}>
            {repo.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
