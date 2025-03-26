"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WorkflowEvent } from "@/lib/services/WorkflowPersistenceService"

interface WorkflowRunDetailProps {
  events: WorkflowEvent[]
}

export default function WorkflowRunDetail({ events }: WorkflowRunDetailProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  )

  const currentEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId)
    : null

  if (!currentEvent) {
    return <div>No events found</div>
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="text-sm font-medium">Events</div>
          <div className="space-y-2">
            {events.map((event) => (
              <Button
                key={event.id}
                variant={selectedEventId === event.id ? "default" : "outline"}
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => setSelectedEventId(event.id)}
              >
                <div>
                  <div className="font-medium capitalize">
                    {event.type.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(event.timestamp, {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {currentEvent ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Event Type</h3>
                  <p className="text-sm capitalize">
                    {currentEvent.type.replace(/_/g, " ")}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Data</h3>
                  <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify(currentEvent.data, null, 2)}
                  </pre>
                </div>

                {currentEvent.metadata && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Metadata</h3>
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(currentEvent.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">Timestamp</h3>
                  <p className="text-sm">
                    {currentEvent.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              Select an event to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
