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
  error?: string
  // optional: the final audio
  audioBlob?: Blob
}

export type VoiceEvent =
  | { type: "phase"; phase: VoicePhase }
  | { type: "time"; recordingTimeSec: number }
  | { type: "ready"; audioBlob: Blob }
  | { type: "error"; message: string }

export interface VoiceService {
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): void // finalize recording
  discard(): void // drop everything, reset to idle
  getState(): VoiceState
  subscribe(listener: (e: VoiceEvent) => void): () => void // returns unsubscribe
}
