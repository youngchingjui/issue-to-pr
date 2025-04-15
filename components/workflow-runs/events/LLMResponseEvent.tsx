import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton"
import { LLMResponseEvent as LLMResponseEventType } from "@/lib/types/workflow"

export interface LLMResponseEventProps {
  event: LLMResponseEventType
  timestamp: Date
}

export function LLMResponseEvent({ event, timestamp }: LLMResponseEventProps) {
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          LLM Response
        </div>
        <EventTime timestamp={timestamp} />
      </div>
      <CopyMarkdownButton content={event.data.content} />
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="hover:bg-muted/50"
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  )
}
