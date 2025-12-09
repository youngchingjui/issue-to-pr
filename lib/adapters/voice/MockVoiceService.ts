// Proposed implementation (key parts)
import {
  VoiceEvent,
  VoicePhase,
  VoicePort,
  VoiceState,
} from "@/lib/types/voice"

export default class MockVoiceService implements VoicePort {
  private state: VoiceState = {
    phase: "idle",
    recordingTimeSec: 0,
    canPause: false,
    canResume: false,
    hasRecording: false,
  }
  private listeners = new Set<(e: VoiceEvent) => void>()
  private timerId: number | null = null

  getState(): VoiceState {
    return this.state
  }

  subscribe(listener: (e: VoiceEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(e: VoiceEvent) {
    this.listeners.forEach((l) => l(e))
  }
  private setPhase(phase: VoicePhase) {
    this.state = {
      ...this.state,
      phase,
      canPause: phase === "recording",
      canResume: phase === "paused",
    }
    this.emit({ type: "phase", phase })
  }
  private startTimer() {
    if (this.timerId) return
    this.timerId = window.setInterval(() => {
      const next = this.state.recordingTimeSec + 1
      this.state = { ...this.state, recordingTimeSec: next }
      this.emit({ type: "time", recordingTimeSec: next })
    }, 1000)
  }
  private stopTimer() {
    if (!this.timerId) return
    window.clearInterval(this.timerId)
    this.timerId = null
  }

  async start(): Promise<void> {
    this.setPhase("recording")
    this.startTimer()
  }

  pause(): void {
    if (this.state.phase !== "recording") return
    this.stopTimer()
    this.setPhase("paused")
  }

  resume(): void {
    if (this.state.phase !== "paused") return
    this.startTimer()
    this.setPhase("recording")
  }

  stop(): void {
    if (this.state.phase !== "recording" && this.state.phase !== "paused")
      return
    this.stopTimer()
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" })
    this.state = { ...this.state, hasRecording: true, audioBlob: blob }
    this.emit({ type: "ready", audioBlob: blob })
    this.setPhase("ready")
  }

  discard(): void {
    this.stopTimer()
    this.state = {
      phase: "idle",
      recordingTimeSec: 0,
      canPause: false,
      canResume: false,
      hasRecording: false,
      audioBlob: undefined,
    }
    this.emit({ type: "phase", phase: "idle" })
  }
}
