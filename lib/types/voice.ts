export type VoiceState =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  | "submitting"
  | "error"

export type VoiceEvent =
  | { type: "state"; state: VoiceState }
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
  subscribe(listener: (e: VoiceEvent) => void): () => void // returns unsubscribe
}

// Separate port for submitting a recorded audio blob to any backend or 3rd party API
export interface VoiceSubmitPort<TReturn = unknown> {
  submit(audioBlob: Blob, mimeType?: string): Promise<TReturn>
}

