"use client"

import { GitPullRequest, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import {
  getLinkedPrQuerySchema,
  getLinkedPrResponseSchema,
} from "@/app/api/issues/[issueId]/pullRequest/schemas"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  repoFullName: string
  issueNumber: number
}

export default function PRStatusIndicator({
  repoFullName,
  issueNumber,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [prNumber, setPrNumber] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const { repo } = getLinkedPrQuerySchema.parse({ repo: repoFullName })
        const res = await fetch(
          `/api/issues/${issueNumber}/pullRequest?repo=${encodeURIComponent(repo)}`
        )
        if (!res.ok)
          throw new Error(`Failed to fetch PR for issue #${issueNumber}`)
        const json = await res.json()
        const data = getLinkedPrResponseSchema.parse(json)
        if (!cancelled) setPrNumber(data.prNumber)
      } catch {
        if (!cancelled) setPrNumber(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [issueNumber, repoFullName])

  return (
    <TooltipProvider delayDuration={200}>
      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
        {loading ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Loader2
                className="inline align-text-bottom mr-0.5 animate-spin text-muted-foreground"
                size={18}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">Checking linked PR…</TooltipContent>
          </Tooltip>
        ) : prNumber ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://github.com/${repoFullName}/pull/${prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <GitPullRequest
                  className="inline align-text-bottom text-green-600"
                  size={18}
                />
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">PR ready</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
