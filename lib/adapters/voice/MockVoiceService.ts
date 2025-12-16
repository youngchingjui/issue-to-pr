// Proposed implementation (key parts)
import { VoiceEvent, VoicePort, VoiceState } from "@/lib/types/voice"

export default class MockVoiceService implements VoicePort {
  private state: VoiceState = "idle"
  private listeners = new Set<(e: VoiceEvent) => void>()

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
  private setState(state: VoiceState) {
    this.state = state
  }

  async start(): Promise<void> {
    this.setState("recording")
  }

  pause(): void {
    if (this.state !== "recording") return
    this.setState("paused")
  }

  resume(): void {
    if (this.state !== "paused") return
    this.setState("recording")
  }

  stop(): void {
    if (this.state !== "recording" && this.state !== "paused") return
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" })
    this.setState("idle")
    this.emit({ type: "ready", audioBlob: blob })
  }

  discard(): void {
    this.setState("idle")
  }
}

