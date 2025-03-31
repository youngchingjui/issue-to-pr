import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { SystemPromptEvent as SystemPromptEventType } from "@/lib/types/workflow"

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
      <EventTime timestamp={timestamp} />
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
