"use server"

import { formatDistanceToNow } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
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
}

function EventContent({ event }: { event: WorkflowEvent }) {
  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} timestamp={event.timestamp} />
    case "system_prompt":
      return <SystemPromptEvent event={event} timestamp={event.timestamp} />
    case "llm_response":
      return <LLMResponseEvent event={event} timestamp={event.timestamp} />
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
}: WorkflowRunDetailProps) {
  if (events.length === 0) {
    return <div>No events found</div>
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 sm:px-6">
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

      <div className="bg-card border rounded-lg p-3 sm:p-4">
        <div className="space-y-3">
          {events.map((event, index) => (
            <EventContent key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  )
}
