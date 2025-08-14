"use client"

import { ArrowDownLeft, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events/EventTime"
import { ToolCallResult } from "@/lib/types"

export interface Props {
  event: ToolCallResult
}

function getCreatedPrUrl(event: ToolCallResult): string | null {
  if (event.toolName !== "create_pull_request") return null
  try {
    const parsed = JSON.parse(event.content)
    if (parsed?.status !== "success") return null
    // GraphQL createPullRequest returns { data: { url } }
    const url = parsed?.pullRequest?.data?.url || parsed?.pullRequest?.html_url
    return typeof url === "string" ? url : null
  } catch {
    return null
  }
}

export function ToolCallResultEvent({ event }: Props) {
  const prUrl = getCreatedPrUrl(event)

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-green-500">Tool Response</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{event.toolName}</span>
        </div>
      </div>
      <EventTime timestamp={event.createdAt} />
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="border-l-2 border-green-500 dark:border-green-400 hover:bg-muted/50"
    >
      <div className="space-y-3">
        {prUrl && (
          <div>
            <Button asChild>
              <a href={prUrl} target="_blank" rel="noopener noreferrer">
                View PR
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
        <div className="font-mono text-sm overflow-x-auto">
          <div className="whitespace-pre-wrap">{event.content}</div>
        </div>
      </div>
    </CollapsibleContent>
  )
}

