import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { LLMResponseEvent as LLMResponseEventType } from "@/lib/types/workflow"

export interface LLMResponseEventProps {
  event: LLMResponseEventType
  timestamp: Date
}

export function LLMResponseEvent({ event, timestamp }: LLMResponseEventProps) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-muted-foreground">
        LLM Response
      </div>
      <EventTime timestamp={timestamp} />
    </>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="hover:bg-muted/50"
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
      <EventTime timestamp={timestamp} />
    </CollapsibleContent>
  )
}
