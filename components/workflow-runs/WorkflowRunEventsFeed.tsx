"use client"

import useSWR from "swr"

import {
  ErrorEvent,
  LLMResponseEvent,
  StatusUpdate,
  SystemPromptEvent,
  ToolCallEvent,
  ToolCallResultEvent,
  UserMessageEvent,
} from "@/components/workflow-runs/events"
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
    <div className="bg-card border rounded-lg overflow-hidden">
      {data.map((event) => (
        <div key={event.id} className="p-3 sm:p-4">
          <EventRenderer event={event} issue={issue} />
        </div>
      ))}
    </div>
  )
}
