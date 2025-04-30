"use server"

import { CheckCircle2 } from "lucide-react"

import { EventTime } from "@/components/workflow-runs/events"
import { StatusEvent, WorkflowState } from "@/lib/types/neo4j"

interface Props {
  event: StatusEvent | WorkflowState
}

export async function StatusUpdate({ event }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex items-center">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <span className="text-sm text-muted-foreground">{event.content}</span>
      <EventTime timestamp={event.createdAt} />
    </div>
  )
}
