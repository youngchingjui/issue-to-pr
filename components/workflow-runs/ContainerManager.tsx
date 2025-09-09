"use client"

import { Loader2, Play, Square, Trash2 } from "lucide-react"
import Link from "next/link"
import { useCallback } from "react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Props {
  workflowId: string
  /** Initial status returned from the server component for fast paint */
  initialStatus: string
}

function badgeVariantForStatus(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "running":
      return "default"
    case "exited":
    case "created":
    case "paused":
    case "dead":
      return "secondary"
    case "not_found":
      return "outline"
    default:
      return "secondary"
  }
}

type ContainerInfo = { status: string; subdomain?: string; url?: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ContainerManager({ workflowId, initialStatus }: Props) {
  const { data, mutate, isValidating } = useSWR<ContainerInfo>(
    `/api/workflow-runs/${workflowId}/container`,
    fetcher,
    {
      fallbackData: { status: initialStatus },
      refreshInterval: (latest) => {
        // Poll periodically to refresh status. Faster while running.
        if (!latest) return 0
        return latest.status === "running" ? 5000 : 15000
      },
    }
  )

  const status = data?.status ?? "unknown"

  const performAction = useCallback(
    async (action: "start" | "stop" | "delete") => {
      await fetch(`/api/workflow-runs/${workflowId}/container`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      mutate()
    },
    [workflowId, mutate]
  )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status badge */}
      <Badge variant={badgeVariantForStatus(status)}>Container: {status}</Badge>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={status === "running" || isValidating}
          onClick={() => performAction("start")}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="sr-only">Start container</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={status !== "running" || isValidating}
          onClick={() => performAction("stop")}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          <span className="sr-only">Stop container</span>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={status === "not_found" || isValidating}
          onClick={() => performAction("delete")}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="sr-only">Delete container</span>
        </Button>

        {/* Open preview button when available */}
        {data?.url && status === "running" && (
          <Link href={data.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="default">
              Open Preview
            </Button>
          </Link>
        )}
      </div>

      {/* Show subdomain label for reference when URL is not configured */}
      {!data?.url && data?.subdomain && (
        <span className="text-xs text-muted-foreground">
          Preview alias: {data.subdomain}
        </span>
      )}
    </div>
  )
}

