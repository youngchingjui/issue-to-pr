export type VoiceState =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  | "submitting"
  | "error"

// Voice adapters emit lifecycle notifications while the UI hook owns state transitions.
// Adapters are expected to emit only non-state events (ready/error/time) and should not
// broadcast UI state updates.
export type VoiceEvent =
  | { type: "time"; recordingTimeSec: number }
  | { type: "ready"; audioBlob: Blob }
  | { type: "error"; message: string }

export type VoiceErrorCode =
  | "permission-denied"
  | "not-supported"
  | "device-busy"
  | "timeout"
  | "network-error"
  | "no-input"
  | "unknown"

export interface VoiceError {
  code: VoiceErrorCode
  message: string
  data?: Record<string, unknown>
}

// Port responsible solely for recording lifecycle (start/pause/resume/stop/discard)
export interface VoicePort {
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): void // finalize recording
  discard(): void // drop everything, reset to idle
  getState(): VoiceState
  // Note: listeners receive only ready/error/time events. UI state transitions are owned by
  // the consuming hook, not by the adapter implementation.
  subscribe(listener: (e: VoiceEvent) => void): () => void // returns unsubscribe
}

// Separate port for submitting a recorded audio blob to any backend or 3rd party API
export interface VoiceSubmitPort<TReturn = unknown> {
  submit(audioBlob: Blob, mimeType?: string): Promise<TReturn>
}

