"use client"

import { useState } from "react"
import useSWR from "swr"

import EventDetailDrawer from "@/components/workflow-runs/EventDetailDrawer"
import { ErrorEvent } from "@/components/workflow-runs/events/ErrorEvent"
import { LLMResponseEvent } from "@/components/workflow-runs/events/LLMResponseEvent"
import { ReasoningEvent } from "@/components/workflow-runs/events/ReasoningEvent"
import { StatusUpdate } from "@/components/workflow-runs/events/StatusUpdate"
import { SystemPromptEvent } from "@/components/workflow-runs/events/SystemPromptEvent"
import { ToolCallEvent } from "@/components/workflow-runs/events/ToolCallEvent"
import { ToolCallResultEvent } from "@/components/workflow-runs/events/ToolCallResultEvent"
import { UserMessageEvent } from "@/components/workflow-runs/events/UserMessageEvent"
import { AnyEvent, Issue } from "@/lib/types"

interface Props {
  workflowId: string
  initialEvents: AnyEvent[]
  issue?: Issue
}

const fetcher = async (url: string): Promise<AnyEvent[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  const json = await res.json()
  return json.events as AnyEvent[]
}

function EventRenderer({ event, issue }: { event: AnyEvent; issue?: Issue }) {
  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} />
    case "systemPrompt":
      return <SystemPromptEvent event={event} />
    case "userMessage":
      return <UserMessageEvent event={event} />
    case "llmResponse":
    case "llmResponseWithPlan":
      return <LLMResponseEvent event={event} issue={issue} />
    case "toolCall":
      return <ToolCallEvent event={event} />
    case "toolCallResult":
      return <ToolCallResultEvent event={event} />
    case "workflowState":
      return <StatusUpdate event={event} />
    case "reviewComment":
      return <UserMessageEvent event={event} />
    case "reasoning":
      return <ReasoningEvent event={event} />
    case "error":
      return <ErrorEvent event={event} />
    default:
      console.error(`Unrecognized event: ${JSON.stringify(event)}`)
      return null
  }
}

export default function WorkflowRunEventsFeed({
  workflowId,
  initialEvents,
  issue,
}: Props) {
  const [selectedEvent, setSelectedEvent] = useState<AnyEvent | null>(null)

  // Check if workflow has reached a terminal state
  const isWorkflowComplete = (events: AnyEvent[]) => {
    const latestWorkflowStateEvent = [...events]
      .reverse()
      .find((event) => event.type === "workflowState")

    if (!latestWorkflowStateEvent) return false

    // WorkflowStateEvent has a 'state' property
    if (latestWorkflowStateEvent.type === "workflowState") {
      const state = latestWorkflowStateEvent.state
      return state === "completed" || state === "error"
    }

    return false
  }

  const { data } = useSWR(`/api/workflow-runs/${workflowId}/events`, fetcher, {
    refreshInterval: (data) =>
      isWorkflowComplete(data || initialEvents) ? 0 : 500,
    fallbackData: initialEvents,
  })

  if (!data) return null

  return (
    <>
      <div className="bg-card border rounded-lg overflow-hidden">
        {data.map((event) => (
          <div
            key={event.id}
            className="p-3 sm:p-4 hover:bg-muted/50 cursor-pointer"
            onClick={() => setSelectedEvent(event)}
          >
            <EventRenderer event={event} issue={issue} />
          </div>
        ))}
      </div>
      <EventDetailDrawer
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
      />
    </>
  )
}

