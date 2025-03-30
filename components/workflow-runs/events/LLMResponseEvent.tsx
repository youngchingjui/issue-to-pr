import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { LLMResponseEvent as LLMResponseEventType } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"

export interface LLMResponseEventProps {
  event: LLMResponseEventType
  isSelected: boolean
  timestamp: Date
}

export function LLMResponseEvent({
  event,
  isSelected,
  timestamp,
}: LLMResponseEventProps) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-muted-foreground">
        LLM Response
      </div>
      <div className="text-xs text-muted-foreground">
        {formatEventTime(timestamp)}
      </div>
    </>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className={isSelected ? "bg-muted" : "hover:bg-muted/50"}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  )
}
