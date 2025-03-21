"use client"

import { useCallback, useState } from "react"

import { StreamHandler } from "@/components/StreamHandler"
import { BaseStreamEvent } from "@/lib/types/events"

export default function DemoPage() {
  const workflowId = "demo-workflow-123"
  const [events, setEvents] = useState<BaseStreamEvent[]>([])
  const [message, setMessage] = useState("")

  const handlePublish = async () => {
    if (!message.trim()) return

    try {
      const event: BaseStreamEvent = {
        type: "token",
        data: message,
      }

      await fetch(`/api/workflow/${workflowId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      })

      // Add to local events history
      setEvents((prev) => [...prev, event])
      setMessage("")
    } catch (error) {
      console.error("Failed to publish event:", error)
    }
  }

  const handleComplete = useCallback((content: string) => {
    console.log("Streaming completed with content:", content)
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error("Streaming error:", error)
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">Stream Handler Demo</h1>

      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to publish"
            className="flex-1 rounded-md border px-4 py-2"
            onKeyDown={(e) => e.key === "Enter" && handlePublish()}
          />
          <button
            onClick={handlePublish}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Publish Event
          </button>
        </div>

        <div className="mb-4">
          <h2 className="mb-2 text-lg font-semibold">Events History:</h2>
          <div className="max-h-60 overflow-y-auto rounded-md border bg-gray-50 p-4">
            {events.map((event, i) => (
              <div key={i} className="mb-2 rounded bg-white p-2 shadow-sm">
                <span className="font-mono text-sm text-gray-500">
                  {event.type}:
                </span>{" "}
                <span className="font-mono">{JSON.stringify(event.data)}</span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-500">
                No events yet. Try publishing one!
              </p>
            )}
          </div>
        </div>

        <StreamHandler
          workflowId={workflowId}
          onComplete={handleComplete}
          onError={handleError}
          className="w-full"
        />
      </div>
    </div>
  )
}
