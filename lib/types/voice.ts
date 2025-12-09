// lib/voice/types.ts
export type VoicePhase =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  | "ready"
  | "error"

export type VoiceState = {
  phase: VoicePhase
  recordingTimeSec: number
  canPause: boolean
  canResume: boolean
  hasRecording: boolean
  error?: VoiceError
  // optional: the final audio
  audioBlob?: Blob
}

export type VoiceEvent =
  | { type: "phase"; phase: VoicePhase }
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

export interface VoicePort {
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): void // finalize recording
  discard(): void // drop everything, reset to idle
  getState(): VoiceState
  subscribe(listener: (e: VoiceEvent) => void): () => void // returns unsubscribe
}
