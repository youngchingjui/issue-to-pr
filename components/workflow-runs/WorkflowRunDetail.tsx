"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { WorkflowEvent } from "@/lib/services/WorkflowPersistenceService"

interface WorkflowRunDetailProps {
  events: WorkflowEvent[]
}

function truncateText(text: string, maxLength: number = 150) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

function EventContent({ event }: { event: WorkflowEvent }) {
  switch (event.type) {
    case "llm_response": {
      const data = event.data as { content?: string }
      return (
        <div className="space-y-2">
          <div className="font-medium text-primary">LLM Response</div>
          <div className="text-sm text-muted-foreground">
            {truncateText(data?.content?.toString() || "")}
          </div>
        </div>
      )
    }

    case "tool_call": {
      const data = event.data as Record<string, any>
      return (
        <div className="space-y-2">
          <div className="font-medium text-blue-500">Tool Call</div>
          <div className="text-sm">
            {data?.tool || "Tool Not Found"}
          </div>
          {data?.parameters && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
              {JSON.stringify(data.parameters, null, 2)}
            </pre>
          )}
        </div>
      )
    }

    case "tool_response": {
      return (
        <div className="space-y-2">
          <div className="font-medium text-green-500">Tool Response</div>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
            {typeof event.data === "string" 
              ? event.data 
              : JSON.stringify(event.data || {}, null, 2)}
          </pre>
        </div>
      )
    }

    case "error": {
      const data = event.data as { message?: string }
      return (
        <div className="space-y-2">
          <div className="font-medium text-destructive">Error</div>
          <div className="text-sm text-destructive">
            {data?.message || "Unknown error"}
          </div>
        </div>
      )
    }

    default:
      return (
        <div className="space-y-2">
          <div className="font-medium capitalize">
            {event.type.replace(/_/g, " ")}
          </div>
          {event.data && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          )}
        </div>
      )
  }
}

function EventDetails({ event }: { event: WorkflowEvent }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Event Type</h3>
        <p className="text-sm capitalize">
          {event.type.replace(/_/g, " ")}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Data</h3>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </div>

      {event.metadata && (
        <div>
          <h3 className="text-sm font-medium mb-1">Metadata</h3>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function WorkflowRunDetail({ events }: WorkflowRunDetailProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  )

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
          <h2 className="text-lg font-semibold">
            {events[0]?.data?.name?.toString() || "Workflow Run"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Started{" "}
            {formatDistanceToNow(events[0].timestamp, {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`relative flex items-start gap-4 ${
                selectedEventId === event.id ? "bg-accent/50 -mx-4 px-4 py-2 rounded-md" : ""
              }`}
            >
              {/* Timeline dot */}
              <div
                className={`relative z-10 h-2 w-2 mt-2 rounded-full border-2 ${
                  selectedEventId === event.id
                    ? "bg-primary border-primary"
                    : "bg-background border-muted-foreground"
                }`}
              />

              {/* Event content */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex-1 text-left space-y-1 -mx-4 px-4 py-2 rounded-md"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <EventContent event={event} />
                    <div className="text-xs text-muted-foreground mt-2">
                      {event.timestamp.toLocaleString()}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[400px]">
                  <EventDetails event={event} />
                </PopoverContent>
              </Popover>

              {/* Arrow to next event */}
              {index < events.length - 1 && (
                <div className="absolute left-[0.5625rem] top-4 h-8 w-px bg-border transform -rotate-45 origin-top" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
