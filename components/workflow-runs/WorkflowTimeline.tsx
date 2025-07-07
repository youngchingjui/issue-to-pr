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

function EventRenderer({
  event,
  issue,
}: {
  event: AnyEvent
  issue?: Issue
}): React.ReactNode {
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function WorkflowTimeline({
  workflowId,
  issue,
  initialEvents = [],
}: {
  workflowId: string
  issue?: Issue
  initialEvents?: AnyEvent[]
}) {
  const { data: events = initialEvents } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/workflow/${workflowId}/events`,
    fetcher,
    { refreshInterval: 1000, fallbackData: initialEvents }
  )

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Timeline</h2>
      <div className="bg-card border rounded-lg overflow-hidden">
        {(events?.length ?? 0) === 0 ? (
          <div>No events yet.</div>
        ) : (
          events.map((event: AnyEvent) => (
            <div key={event.id} className="p-3 sm:p-4">
              <EventRenderer event={event} issue={issue} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
