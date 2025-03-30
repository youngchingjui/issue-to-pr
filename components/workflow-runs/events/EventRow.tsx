import { format } from "date-fns"
import { ReactNode } from "react"

interface BaseEventRowProps {
  timestamp: Date
  children: ReactNode
}

interface StatusEventRowProps extends BaseEventRowProps {
  showTimestamp: boolean
  isLastStatus: boolean
}

// Format timestamp for display in the workflow run view
function formatEventTime(timestamp: Date): string {
  return format(timestamp, "HH:mm:ss")
}

export function EventRow({ timestamp, children }: BaseEventRowProps) {
  return (
    <div className="contents">
      <div className="text-xs text-muted-foreground text-right">
        {formatEventTime(timestamp)}
      </div>
      {children}
    </div>
  )
}

export function StatusEventRow({
  timestamp,
  showTimestamp,
  isLastStatus,
  children,
}: StatusEventRowProps) {
  return (
    <div className={`contents ${isLastStatus ? "pb-1" : ""}`}>
      <div
        className={`text-xs text-muted-foreground text-right ${
          !showTimestamp && "invisible"
        }`}
      >
        {formatEventTime(timestamp)}
      </div>
      {children}
    </div>
  )
}
