"use server"

import {
  DefaultEvent,
  ErrorEvent,
  LLMResponseEvent,
  StatusUpdate,
  SystemPromptEvent,
  ToolCallEvent,
  ToolResponseEvent,
  UserMessageEvent,
} from "@/components/workflow-runs/events"
import { WorkflowEvent } from "@/lib/types/workflow"

interface WorkflowRunDetailProps {
  events: WorkflowEvent[]
  issue?: { number: number; repoFullName: string }
}

function EventContent({
  event,
  issue,
}: {
  event: WorkflowEvent
  issue?: { number: number; repoFullName: string }
}) {
  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} timestamp={event.timestamp} />
    case "system_prompt":
      return <SystemPromptEvent event={event} timestamp={event.timestamp} />
    case "llm_response":
      return (
        <LLMResponseEvent
          event={event}
          timestamp={event.timestamp}
          issue={issue}
        />
      )
    case "user_message":
      return <UserMessageEvent event={event} timestamp={event.timestamp} />
    case "tool_call":
      return <ToolCallEvent event={event} />
    case "tool_response":
      return <ToolResponseEvent event={event} />
    case "error":
      return <ErrorEvent event={event} />
    default:
      return <DefaultEvent event={event} />
  }
}

export default async function WorkflowRunDetail({
  events,
  issue,
}: WorkflowRunDetailProps) {
  if (events.length === 0) {
    return <div>No events found</div>
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {events.map((event) => (
        <div key={event.id} className="p-3 sm:p-4">
          <EventContent event={event} issue={issue} />
        </div>
      ))}
    </div>
  )
}
