"use client"

import { useEffect, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface RepoOption {
  id: number
  full_name: string
}

interface Props {
  repositories: RepoOption[]
}

export default function CodexForm({ repositories }: Props) {
  const [repo, setRepo] = useState<string>("")
  const [branch, setBranch] = useState<string>("")
  const [branches, setBranches] = useState<string[]>([])
  const [instructions, setInstructions] = useState<string>("")

  useEffect(() => {
    if (repo) {
      fetch("/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: repo }),
      })
        .then((res) => res.json())
        .then((data) => {
          setBranches(data.branches || [])
        })
        .catch((err) => {
          console.error(err)
          setBranches([])
        })
    } else {
      setBranches([])
      setBranch("")
    }
  }, [repo])

  return (
    <div className="space-y-4">
      <Select onValueChange={setRepo} value={repo}>
        <SelectTrigger>
          <SelectValue placeholder="Select repository" />
        </SelectTrigger>
        <SelectContent>
          {repositories.map((r) => (
            <SelectItem key={r.id} value={r.full_name}>
              {r.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={setBranch} value={branch} disabled={!repo}>
        <SelectTrigger>
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Describe the changes you'd like to make"
        rows={10}
      />
    </div>
  )
}
