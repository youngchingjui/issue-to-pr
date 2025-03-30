import { format } from "date-fns"
import { CheckCircle2 } from "lucide-react"

import { StatusEvent } from "@/lib/types/workflow"

interface StatusUpdateProps {
  event: StatusEvent
  showTimestamp?: boolean
}

export function StatusUpdate({
  event,
  showTimestamp = false,
}: StatusUpdateProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 items-center py-1">
      {showTimestamp && (
        <div className="text-xs text-muted-foreground text-right">
          {format(event.timestamp, "HH:mm:ss")}
        </div>
      )}
      {!showTimestamp && <div />}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 flex items-center">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
        <span className="text-sm text-muted-foreground">
          {event.data.status}
        </span>
      </div>
    </div>
  )
}
