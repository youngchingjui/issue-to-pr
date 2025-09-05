export type TelemetryLevel = "debug" | "info" | "warn" | "error"

export interface TelemetryEvent {
  name: string
  level?: TelemetryLevel
  data?: Record<string, unknown>
  timestamp?: Date
}

export interface TraceHandle {
  id: string
}

export interface TelemetryPort {
  /** Start a new trace for a workflow run (maps to Langfuse trace). */
  startTrace(params: {
    name: string
    id?: string
    userId?: string
    metadata?: Record<string, unknown>
  }): Promise<TraceHandle>

  /** Finish a trace (marks completion in telemetry backend). */
  endTrace(trace: TraceHandle, params?: { metadata?: Record<string, unknown> }): Promise<void>

  /** Record an event within a trace (maps to Langfuse event). */
  trackEvent(trace: TraceHandle, event: TelemetryEvent): Promise<void>
}

