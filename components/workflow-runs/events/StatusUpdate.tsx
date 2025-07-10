"use client"

import { CheckCircle2 } from "lucide-react"

import { EventTime } from "@/components/workflow-runs/events"
import { StatusEvent, WorkflowStateEvent } from "@/lib/types"

interface Props {
  event: StatusEvent | WorkflowStateEvent
}

export async function StatusUpdate({ event }: Props) {
  let displayText: string | undefined
  if (event.type === "status") {
    displayText = event.content
  } else if (event.type === "workflowState") {
    displayText = event.content || event.state
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex items-center">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <span className="text-sm text-muted-foreground">{displayText}</span>
      <EventTime timestamp={event.createdAt} />
    </div>
  )
}
