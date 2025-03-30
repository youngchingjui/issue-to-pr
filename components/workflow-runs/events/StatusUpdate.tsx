import { CheckCircle2 } from "lucide-react"

import { StatusEvent } from "@/lib/types/workflow"

interface StatusUpdateProps {
  event: StatusEvent
  showTimestamp: boolean
  isLastStatus?: boolean
}

export function StatusUpdate({
  event,
  showTimestamp = false,
  isLastStatus = false,
}: StatusUpdateProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex items-center">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <span className="text-sm text-muted-foreground">{event.data.status}</span>
    </div>
  )
}
