"use client"

import { ArrowDownLeft } from "lucide-react"

import CreatedPullRequestCard from "@/components/pull-requests/CreatedPullRequestCard"
import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events/EventTime"
import { ToolCallResult } from "@/lib/types"

export interface Props {
  event: ToolCallResult
}

export function ToolCallResultEvent({ event }: Props) {
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

  // Attempt to parse the tool response content to detect PR creation success
  let prData: {
    number: number
    title: string
    body?: string | null
    url: string
  } | null = null
  try {
    const parsed = JSON.parse(event.content || "{}")
    if (
      event.toolName === "create_pull_request" &&
      parsed?.status === "success" &&
      parsed?.pullRequest?.data?.url
    ) {
      const pr = parsed.pullRequest?.data
      if (pr?.number && pr?.title && pr?.url) {
        prData = {
          number: Number(pr.number),
          title: String(pr.title),
          body: pr.body ?? null,
          url: String(pr.url),
        }
      }
    }
  } catch {
    // Ignore parse errors; we'll just render the raw content below
  }

  return (
    <>
      {prData ? (
        <div className="space-y-3">
          <CreatedPullRequestCard
            number={prData.number}
            title={prData.title}
            body={prData.body}
            url={prData.url}
          />
        </div>
      ) : (
        <CollapsibleContent
          headerContent={headerContent}
          className="border-l-2 border-green-500 dark:border-green-400 hover:bg-muted/50"
        >
          <div className="space-y-3">
            <div className="font-mono text-sm overflow-x-auto">
              <div className="whitespace-pre-wrap">{event.content}</div>
            </div>
          </div>
        </CollapsibleContent>
      )}
    </>
  )
}
