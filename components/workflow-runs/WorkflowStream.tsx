"use client"

import { useEffect, useState } from "react"

import { WorkflowEvent } from "@/lib/services/EventEmitter"

interface WorkflowStreamProps {
  workflowId: string
}

export default function WorkflowStream({ workflowId }: WorkflowStreamProps) {
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/workflow/${workflowId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WorkflowEvent
        setEvents((prev) => [...prev, data])
      } catch (error) {
        console.error("Failed to parse event data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error)
      setError("Connection failed. Please try refreshing the page.")
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [workflowId])

  const renderEventContent = (event: WorkflowEvent) => {
    switch (event.type) {
      case "llm_response":
        return (
          <div className="prose">
            <div className="text-sm text-gray-500">LLM Response:</div>
            <div className="whitespace-pre-wrap">{event.data.content}</div>
          </div>
        )

      case "tool_call":
        return (
          <div>
            <div className="text-sm text-gray-500">Tool Called:</div>
            <div className="font-mono text-sm">
              {event.data.toolCalls.map((call, i) => (
                <div key={i} className="mt-1">
                  {call.function.name}({call.function.arguments})
                </div>
              ))}
            </div>
          </div>
        )

      case "tool_response":
        return (
          <div>
            <div className="text-sm text-gray-500">
              Tool Response ({event.data.toolName}):
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap">
              {event.data.response}
            </div>
          </div>
        )

      case "error":
        return (
          <div className="text-red-600">
            <div className="text-sm text-red-500">Error:</div>
            <div>
              {event.data instanceof Error
                ? event.data.message
                : "Unknown error"}
            </div>
          </div>
        )

      case "complete":
        return (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="text-sm text-gray-500">Complete:</div>
            <div className="whitespace-pre-wrap">{event.data.content}</div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            {renderEventContent(event)}
            <div className="text-xs text-gray-400 mt-2">
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
