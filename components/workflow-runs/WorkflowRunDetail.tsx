"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DefaultEvent,
  ErrorEvent,
  EventDetails,
  EventRow,
  LLMResponseEvent,
  StatusEventRow,
  StatusUpdate,
  ToolCallEvent,
  ToolResponseEvent,
} from "@/components/workflow-runs/events"
import { WorkflowEvent } from "@/lib/types/workflow"

interface WorkflowRunDetailProps {
  events: WorkflowEvent[]
}

function EventContent({
  event,
  isSelected,
  onClick,
  previousEvent,
  nextEvent,
}: {
  event: WorkflowEvent
  isSelected: boolean
  onClick: () => void
  previousEvent?: WorkflowEvent
  nextEvent?: WorkflowEvent
}) {
  if (event.type === "status") {
    // Only show timestamp if no previous event or if the timestamps differ by at least a second
    const showTimestamp =
      !previousEvent ||
      Math.floor(event.timestamp.getTime() / 1000) !==
        Math.floor(previousEvent.timestamp.getTime() / 1000)

    const nextIsNotStatus = nextEvent && nextEvent.type !== "status"

    return (
      <StatusEventRow
        timestamp={event.timestamp}
        showTimestamp={showTimestamp}
        isLastStatus={nextIsNotStatus}
      >
        <StatusUpdate
          event={event}
          showTimestamp={showTimestamp}
          isLastStatus={nextIsNotStatus}
        />
      </StatusEventRow>
    )
  }

  switch (event.type) {
    case "llm_response":
      return (
        <EventRow timestamp={event.timestamp}>
          <LLMResponseEvent
            event={event}
            isSelected={isSelected}
            onClick={onClick}
          />
        </EventRow>
      )
    case "tool_call":
      return (
        <EventRow timestamp={event.timestamp}>
          <ToolCallEvent
            event={event}
            isSelected={isSelected}
            onClick={onClick}
          />
        </EventRow>
      )
    case "tool_response":
      return (
        <EventRow timestamp={event.timestamp}>
          <ToolResponseEvent
            event={event}
            isSelected={isSelected}
            onClick={onClick}
          />
        </EventRow>
      )
    case "error":
      return (
        <EventRow timestamp={event.timestamp}>
          <ErrorEvent event={event} isSelected={isSelected} onClick={onClick} />
        </EventRow>
      )
    default:
      return (
        <EventRow timestamp={event.timestamp}>
          <DefaultEvent
            event={event}
            isSelected={isSelected}
            onClick={onClick}
          />
        </EventRow>
      )
  }
}

export default function WorkflowRunDetail({ events }: WorkflowRunDetailProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  )
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const selectedEvent = events.find((event) => event.id === selectedEventId)

  if (events.length === 0) {
    return <div>No events found</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/workflow-runs">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Workflow Run</h2>
          <p className="text-sm text-muted-foreground">
            Started{" "}
            {formatDistanceToNow(events[0].timestamp, {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="grid grid-cols-[100px_1fr] gap-4">
          {events.map((event, index) => (
            <EventContent
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onClick={() => {
                setSelectedEventId(event.id)
                setIsSheetOpen(true)
              }}
              previousEvent={index > 0 ? events[index - 1] : undefined}
              nextEvent={
                index < events.length - 1 ? events[index + 1] : undefined
              }
            />
          ))}
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedEvent?.type.replace(/_/g, " ").toUpperCase()}
            </SheetTitle>
          </SheetHeader>
          {selectedEvent && <EventDetails event={selectedEvent} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}
