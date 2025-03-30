import ReactMarkdown from "react-markdown"

import { LLMResponseEvent as LLMResponseEventType } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils/utils-common"

export interface LLMResponseEventProps {
  event: LLMResponseEventType
  isSelected: boolean
  onClick: () => void
  timestamp: Date
}

export function LLMResponseEvent({
  event,
  isSelected,
  onClick,
  timestamp,
}: LLMResponseEventProps) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border transition-colors w-full overflow-hidden",
        isSelected ? "bg-muted" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          LLM Response
        </div>
        <div className="text-xs text-muted-foreground">
          {formatEventTime(timestamp)}
        </div>
      </div>
      <div className="p-3 sm:p-4 prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
    </div>
  )
}
