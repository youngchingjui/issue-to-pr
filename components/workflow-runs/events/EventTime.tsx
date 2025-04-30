"use client"

import { format, isToday } from "date-fns"

interface Props {
  timestamp: Date
}

export function EventTime({ timestamp }: Props) {
  const date = new Date(timestamp)
  const formattedTime = isToday(date)
    ? format(date, "HH:mm:ss")
    : format(date, "yyyy-MM-dd HH:mm:ss") // Shows like "2024-03-15 17:31:35"

  return <div className="text-xs text-muted-foreground">{formattedTime}</div>
}
