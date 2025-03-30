import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { UserMessageEvent as UserMessageEventType } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"

export interface UserMessageEventProps {
  event: UserMessageEventType
  isSelected: boolean
  timestamp: Date
}

export function UserMessageEvent({
  event,
  isSelected,
  timestamp,
}: UserMessageEventProps) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-muted-foreground">
        User Message
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
