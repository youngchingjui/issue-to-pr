import ReactMarkdown from "react-markdown"

import { LLMResponseEvent as LLMResponseEventType } from "@/lib/types/workflow"
import { cn } from "@/lib/utils/utils-common"

export interface LLMResponseEventProps {
  event: LLMResponseEventType
  isSelected: boolean
  onClick: () => void
}

export function LLMResponseEvent({
  event,
  isSelected,
  onClick,
}: LLMResponseEventProps) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border transition-colors",
        isSelected ? "bg-muted" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="px-4 py-2 border-b">
        <div className="text-xs font-medium text-muted-foreground">
          LLM Response
        </div>
      </div>
      <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
    </div>
  )
}
