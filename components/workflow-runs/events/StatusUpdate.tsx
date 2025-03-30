import { CheckCircle2 } from "lucide-react"

import { StatusEvent } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"

interface StatusUpdateProps {
  event: StatusEvent
  timestamp: Date
}

export function StatusUpdate({ event, timestamp }: StatusUpdateProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex items-center">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <span className="text-sm text-muted-foreground">{event.data.status}</span>
      <span className="text-xs text-muted-foreground ml-auto">
        {formatEventTime(timestamp)}
      </span>
    </div>
  )
}
