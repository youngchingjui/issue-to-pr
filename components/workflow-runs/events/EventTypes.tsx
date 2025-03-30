import { formatDistanceToNow } from "date-fns"

import { EventCard } from "@/components/workflow-runs/events/EventCard"
import {
  ErrorEvent as ErrorEventType,
  ToolCallEvent as ToolCallEventType,
  ToolResponseEvent as ToolResponseEventType,
  WorkflowEvent,
} from "@/lib/types/workflow"

interface EventTypeProps<T extends WorkflowEvent> {
  event: T
  isSelected: boolean
  onClick: () => void
}

export function ToolCallEvent({
  event,
  isSelected,
  onClick,
}: EventTypeProps<ToolCallEventType>) {
  const { data } = event
  return (
    <EventCard event={event} isSelected={isSelected} onClick={onClick}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="font-medium text-blue-500 text-sm">Tool Call</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </div>
        </div>
        <div className="text-sm font-medium">{data.toolName}</div>
        {data.arguments && (
          <pre className="text-xs mt-2 font-mono text-muted-foreground overflow-auto max-h-24">
            {JSON.stringify(data.arguments, null, 2)}
          </pre>
        )}
      </div>
    </EventCard>
  )
}

export function ToolResponseEvent({
  event,
  isSelected,
  onClick,
}: EventTypeProps<ToolResponseEventType>) {
  const { data } = event
  return (
    <EventCard event={event} isSelected={isSelected} onClick={onClick}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="font-medium text-green-500 text-sm">
            Tool Response
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </div>
        </div>
        <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-24">
          {JSON.stringify(data.response, null, 2)}
        </pre>
      </div>
    </EventCard>
  )
}

export function ErrorEvent({
  event,
  isSelected,
  onClick,
}: EventTypeProps<ErrorEventType>) {
  const { data } = event
  return (
    <EventCard event={event} isSelected={isSelected} onClick={onClick}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="font-medium text-destructive text-sm">Error</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </div>
        </div>
        <div className="text-sm text-destructive">
          {data.error instanceof Error ? data.error.message : data.error}
        </div>
      </div>
    </EventCard>
  )
}

export function DefaultEvent({
  event,
  isSelected,
  onClick,
}: EventTypeProps<WorkflowEvent>) {
  return (
    <EventCard event={event} isSelected={isSelected} onClick={onClick}>
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
