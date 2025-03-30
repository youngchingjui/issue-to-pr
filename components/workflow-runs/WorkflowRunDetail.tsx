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
  showTimestamp = false,
}: {
  event: WorkflowEvent
  isSelected: boolean
  onClick: () => void
  showTimestamp?: boolean
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
    case "status":
      return <StatusUpdate event={event} showTimestamp={showTimestamp} />
    default:
      return (
        <DefaultEvent event={event} isSelected={isSelected} onClick={onClick} />
      )
  }
}

// Helper function to check if two dates are in the same second
function isSameSecond(date1: Date, date2: Date): boolean {
  return (
    Math.floor(date1.getTime() / 1000) === Math.floor(date2.getTime() / 1000)
  )
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

  // Group consecutive status events
  const groupedEvents = events.reduce<Array<WorkflowEvent | WorkflowEvent[]>>(
    (acc, event, index) => {
      const prevEvent = index > 0 ? events[index - 1] : null
      const isStatus = event.type === "status"
      const isPrevStatus = prevEvent?.type === "status"

      if (isStatus && isPrevStatus) {
        // If the last item is an array, add to it, otherwise create new array
        const lastItem = acc[acc.length - 1]
        if (Array.isArray(lastItem)) {
          lastItem.push(event)
        } else {
          acc.push([prevEvent!, event])
        }
      } else if (isStatus) {
        // Start a new array with just this status event
        acc.push([event])
      } else {
        acc.push(event)
      }

      return acc
    },
    []
  )

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
          {groupedEvents.map((eventOrGroup, index) => {
            if (Array.isArray(eventOrGroup)) {
              // Render status group
              return (
                <div key={eventOrGroup[0].id} className="w-full space-y-1 py-2">
                  {eventOrGroup.map((event, i) => {
                    // Show timestamp if it's the first event or if the timestamp differs from the previous event
                    const prevEvent = i > 0 ? eventOrGroup[i - 1] : null
                    const showTimestamp =
                      !prevEvent ||
                      !isSameSecond(event.timestamp, prevEvent.timestamp)

                    return (
                      <EventContent
                        key={event.id}
                        event={event}
                        isSelected={selectedEventId === event.id}
                        onClick={() => {
                          setSelectedEventId(event.id)
                          setIsSheetOpen(true)
                        }}
                        showTimestamp={showTimestamp}
                      />
                    )
                  })}
                </div>
              )
            }

            // Render single event
            return (
              <div
                key={eventOrGroup.id}
                className="relative min-w-[300px] max-w-[90%]"
              >
                <EventContent
                  event={eventOrGroup}
                  isSelected={selectedEventId === eventOrGroup.id}
                  onClick={() => {
                    setSelectedEventId(eventOrGroup.id)
                    setIsSheetOpen(true)
                  }}
                  showTimestamp={true}
                />
                {index < groupedEvents.length - 1 && (
                  <div className="absolute left-1/2 -bottom-6 h-6 w-px bg-border" />
                )}
              </div>
            )
          })}
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
