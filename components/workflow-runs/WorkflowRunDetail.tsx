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
  LLMResponseEvent,
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
}: {
  event: WorkflowEvent
  isSelected: boolean
  onClick: () => void
}) {
  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} timestamp={event.timestamp} />
    case "llm_response":
      return (
        <LLMResponseEvent
          event={event}
          isSelected={isSelected}
          onClick={onClick}
          timestamp={event.timestamp}
        />
      )
    case "tool_call":
      return (
        <ToolCallEvent
          event={event}
          isSelected={isSelected}
          onClick={onClick}
        />
      )
    case "tool_response":
      return (
        <ToolResponseEvent
          event={event}
          isSelected={isSelected}
          onClick={onClick}
        />
      )
    case "error":
      return (
        <ErrorEvent event={event} isSelected={isSelected} onClick={onClick} />
      )
    default:
      return (
        <DefaultEvent event={event} isSelected={isSelected} onClick={onClick} />
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
    <div className="space-y-4 max-w-3xl mx-auto px-4 sm:px-6">
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

      <div className="bg-card border rounded-lg p-3 sm:p-4">
        <div className="space-y-3">
          {events.map((event, index) => (
            <EventContent
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onClick={() => {
                setSelectedEventId(event.id)
                setIsSheetOpen(true)
              }}
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
