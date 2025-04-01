import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchReposParams } from "@/lib/github/search"

interface IssueSearchProps {
  onSearch: (params: SearchReposParams) => void
  defaultValues?: Partial<SearchReposParams>
}

export function IssueSearch({ onSearch, defaultValues }: IssueSearchProps) {
  const [topic, setTopic] = useState(defaultValues?.topic ?? "nextjs")
  const [maxStars, setMaxStars] = useState<number | undefined>(
    defaultValues?.maxStars
  )
  const [minStars, setMinStars] = useState<number | undefined>(
    defaultValues?.minStars
  )
  const [language, setLanguage] = useState(
    defaultValues?.language ?? "typescript"
  )
  const [issueLabel, setIssueLabel] = useState(
    defaultValues?.issueLabel ?? "bug"
  )
  const [state, setState] = useState<"open" | "closed" | "all">(
    defaultValues?.state ?? "open"
  )

  const handleSearch = () => {
    onSearch({
      topic,
      maxStars,
      minStars,
      language,
      issueLabel,
      state,
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            placeholder="e.g., nextjs"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            placeholder="e.g., typescript"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxStars">Maximum Stars</Label>
          <Input
            id="maxStars"
            type="number"
            placeholder="e.g., 1000"
            value={maxStars ?? ""}
            onChange={(e) =>
              setMaxStars(e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minStars">Minimum Stars</Label>
          <Input
            id="minStars"
            type="number"
            placeholder="e.g., 100"
            value={minStars ?? ""}
            onChange={(e) =>
              setMinStars(e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issueLabel">Issue Label</Label>
          <Input
            id="issueLabel"
            placeholder="e.g., bug"
            value={issueLabel}
            onChange={(e) => setIssueLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="space-x-2">
        <Button
          variant={state === "open" ? "default" : "outline"}
          onClick={() => setState("open")}
        >
          Open Issues
        </Button>
        <Button
          variant={state === "closed" ? "default" : "outline"}
          onClick={() => setState("closed")}
        >
          Closed Issues
        </Button>
        <Button
          variant={state === "all" ? "default" : "outline"}
          onClick={() => setState("all")}
        >
          All Issues
        </Button>
      </div>

      <Button onClick={handleSearch} className="w-full">
        Search
      </Button>
    </div>
  )
}
