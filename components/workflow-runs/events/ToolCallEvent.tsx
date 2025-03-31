import { Code2 } from "lucide-react"

import { EventTime } from "@/components/workflow-runs/events"
import { ToolCallEvent as ToolCallEventType } from "@/lib/types/workflow"

export interface ToolCallEventProps {
  event: ToolCallEventType
}

export function ToolCallEvent({ event }: ToolCallEventProps) {
  const { data, timestamp } = event

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-blue-500" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-blue-500">Tool Call</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{data.toolName}</span>
          </div>
        </div>
        <EventTime timestamp={timestamp} />
      </div>

      {Object.entries(data.arguments).length > 0 && (
        <div className="mt-2 space-y-1.5">
          {Object.entries(data.arguments).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium text-muted-foreground">{key}:</span>{" "}
              <span className="font-mono">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
