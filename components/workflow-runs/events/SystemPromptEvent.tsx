import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { SystemPromptEvent as SystemPromptEventType } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"

export interface SystemPromptEventProps {
  event: SystemPromptEventType
  timestamp: Date
}

export function SystemPromptEvent({
  event,
  timestamp,
}: SystemPromptEventProps) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-blue-500 dark:text-blue-400">
        System Prompt
      </div>
      <div className="text-xs text-muted-foreground">
        {formatEventTime(timestamp)}
      </div>
    </>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className={`border-l-2 border-blue-500 dark:border-blue-400 hover:bg-muted/50`}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.data.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  )
}
