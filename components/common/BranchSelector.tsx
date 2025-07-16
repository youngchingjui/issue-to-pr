"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BranchSelectorProps {
  value: string
  onChange: (value: string) => void
}

// Temporary mock branches. Once the backend is wired up this list will come
// from the GitHub API.
const mockBranches = [
  "main",
  "develop",
  "feature/example",
  "release/v1.0.0",
  "fix/typo",
]

export default function BranchSelector({
  value,
  onChange,
}: BranchSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="branch-selector" className="text-sm">
        Launch from
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="branch-selector" className="w-full md:w-60">
          <SelectValue placeholder="Select branch, tag or commit" />
        </SelectTrigger>
        <SelectContent>
          {mockBranches.map((branch) => (
            <SelectItem key={branch} value={branch} className="capitalize">
              {branch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
