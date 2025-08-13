"use client"

import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton"
import { EventTime } from "@/components/workflow-runs/events/EventTime"
import { ReasoningEvent as ReasoningEventType } from "@/lib/types"

interface Props {
  event: ReasoningEventType
}

export function ReasoningEvent({ event }: Props) {
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Thinking
        </div>
        <EventTime timestamp={event.createdAt} />
      </div>
      <CopyMarkdownButton content={`${event.title}\n\n${event.content}`} />
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="hover:bg-muted/50 border-l-2 border-muted-foreground/40"
    >
      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground">
          {event.title}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          <ReactMarkdown>{event.content}</ReactMarkdown>
        </div>
      </div>
    </CollapsibleContent>
  )
}
