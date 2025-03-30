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
  ToolCallEvent,
  ToolResponseEvent,
} from "@/components/workflow-runs/events"
import { WorkflowEvent } from "@/lib/services/WorkflowPersistenceService"

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
    case "llm_response":
      return (
        <LLMResponseEvent
          event={event}
          isSelected={isSelected}
          onClick={onClick}
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
        <div className="space-y-6 flex flex-col items-center">
          {events.map((event, index) => (
            <div key={event.id} className="relative min-w-[300px] max-w-[90%]">
              <EventContent
                event={event}
                isSelected={selectedEventId === event.id}
                onClick={() => {
                  setSelectedEventId(event.id)
                  setIsSheetOpen(true)
                }}
              />
              {index < events.length - 1 && (
                <div className="absolute left-1/2 -bottom-6 h-6 w-px bg-border" />
              )}
            </div>
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
