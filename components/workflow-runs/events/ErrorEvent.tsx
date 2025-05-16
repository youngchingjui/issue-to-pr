import { XCircle } from "lucide-react"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { ErrorEvent as ErrorEventType } from "@/lib/types"

interface Props {
  event: ErrorEventType
}

export function ErrorEvent({ event }: Props) {
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-destructive text-sm">Error</span>
        </div>
      </div>
      <EventTime timestamp={event.createdAt} />
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="border-l-2 border-destructive hover:bg-muted/50"
    >
      <div className="space-y-3">
        <div className="text-sm text-destructive">{event.content}</div>
      </div>
    </CollapsibleContent>
  )
}
