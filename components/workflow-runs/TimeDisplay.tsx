"use client"

import { formatDistanceToNow } from "date-fns"

interface TimeDisplayProps {
  timestamp: Date
}

export function TimeDisplay({ timestamp }: TimeDisplayProps) {
  return (
    <span>
      {formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
      })}
    </span>
  )
}
