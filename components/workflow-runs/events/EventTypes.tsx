import { formatDistanceToNow } from "date-fns"

import { EventCard } from "@/components/workflow-runs/events/EventCard"
import { WorkflowEvent } from "@/lib/types/workflow"

interface EventTypeProps<T extends WorkflowEvent> {
  event: T
}

export function DefaultEvent({ event }: EventTypeProps<WorkflowEvent>) {
  return (
    <EventCard event={event}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="font-medium text-sm capitalize">
            {event.type.replace(/_/g, " ")}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </div>
        </div>
        {event.data && (
          <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-24">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        )}
      </div>
    </EventCard>
  )
}

export { ErrorEvent } from "./ErrorEvent"
