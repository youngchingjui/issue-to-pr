import { format } from "date-fns"

export function formatEventTime(timestamp: Date): string {
  return format(timestamp, "HH:mm:ss")
}
