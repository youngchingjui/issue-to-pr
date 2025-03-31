import { ArrowDownLeft } from "lucide-react"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { ToolResponseEvent as ToolResponseEventType } from "@/lib/types/workflow"

export interface ToolResponseEventProps {
  event: ToolResponseEventType
}

export function ToolResponseEvent({ event }: ToolResponseEventProps) {
  const { data, timestamp } = event

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-green-500">Tool Response</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{data.toolName}</span>
        </div>
      </div>
      <EventTime timestamp={timestamp} />
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="border-l-2 border-green-500 dark:border-green-400 hover:bg-muted/50"
    >
      <div className="font-mono text-sm overflow-x-auto">
        {typeof data.response === "string" ? (
          <div className="whitespace-pre-wrap">{data.response}</div>
        ) : (
          <pre className="text-sm">
            {JSON.stringify(data.response, null, 2)}
          </pre>
        )}
      </div>
    </CollapsibleContent>
  )
}
