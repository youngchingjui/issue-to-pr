"use client"

import useSWR from "swr"

import { AnyEvent, Issue } from "@/lib/types"
import {
  ErrorEvent,
  LLMResponseEvent,
  StatusUpdate,
  SystemPromptEvent,
  ToolCallEvent,
  ToolCallResultEvent,
  UserMessageEvent,
} from "@/components/workflow-runs/events"

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
  const { data } = useSWR(`/api/workflow-runs/${workflowId}/events`, fetcher, {
    refreshInterval: 1000,
    fallbackData: initialEvents,
    keepPreviousData: true,
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
