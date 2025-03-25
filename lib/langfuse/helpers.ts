import { Observation, TraceWithDetails } from "@/lib/types/langfuse"

export function getTraceStatus(
  trace: TraceWithDetails
): "error" | "completed" | "active" {
  if (!trace.observations || !Array.isArray(trace.observations)) {
    return "active"
  }

  // Cast to our extended Observation type that includes additional fields
  const observations = trace.observations as unknown as Observation[]

  // Check if there are any error observations
  const hasErrors = observations.some((obs) => obs.level === "ERROR")
  if (hasErrors) return "error"

  // Check if the trace is complete (has all observations finished)
  const isComplete = observations.every((obs) => obs.endTime)
  if (isComplete) return "completed"

  return "active"
}

export function getStatusVariant(
  status: string | undefined,
  isComplete?: boolean
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "error") return "destructive"
  if (isComplete || status === "completed") return "secondary"
  return "default"
}
