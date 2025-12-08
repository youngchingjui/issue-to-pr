// Proposed implementation (key parts)
import {
  VoiceEvent,
  VoicePhase,
  VoiceService,
  VoiceState,
} from "@/lib/types/voice"

export default class MediaRecorderVoiceService implements VoiceService {
  private state: VoiceState = {
    phase: "idle",
    recordingTimeSec: 0,
    canPause: false,
    canResume: false,
    hasRecording: false,
  }
  private listeners = new Set<(e: VoiceEvent) => void>()
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private timerId: number | null = null
  private mimeType: string = "audio/webm"

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
  private cleanupStream() {
    try {
      this.stream?.getTracks().forEach((t) => t.stop())
    } finally {
      this.stream = null
    }
  }
  private fail(message: string) {
    this.state = { ...this.state, error: message }
    this.emit({ type: "error", message })
    this.setPhase("error")
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail("Your browser does not support audio recording.")
      return
    }
    this.setPhase("starting")
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // pick the first supported mime type
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/wav",
      ]
      for (const t of candidates) {
        try {
          if (MediaRecorder.isTypeSupported(t)) {
            this.mimeType = t
            break
          }
        } catch {
          // ignore
        }
      }

      this.recorder = this.mimeType
        ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
        : new MediaRecorder(this.stream)

      this.chunks = []
      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data)
      }
      this.recorder.onstop = () => {
        this.stopTimer()
        let blob: Blob
        try {
          blob = new Blob(this.chunks, { type: this.mimeType })
        } catch {
          blob = new Blob(this.chunks)
        }
        this.chunks = []
        this.cleanupStream()
        this.state = { ...this.state, hasRecording: true, audioBlob: blob }
        this.emit({ type: "ready", audioBlob: blob })
        this.setPhase("ready")
        this.recorder = null
      }

      this.recorder.start()
      this.setPhase("recording")
      this.startTimer()
    } catch (err) {
      this.fail(`Unable to access microphone: ${String(err)}`)
      this.cleanupStream()
      this.recorder = null
      this.chunks = []
    }
  }

  pause(): void {
    if (!this.recorder || this.state.phase !== "recording") return
    try {
      this.recorder.pause()
      this.stopTimer()
      this.setPhase("paused")
    } catch {
      // swallow
    }
  }

  resume(): void {
    if (!this.recorder || this.state.phase !== "paused") return
    try {
      this.recorder.resume()
      this.startTimer()
      this.setPhase("recording")
    } catch {
      // swallow
    }
  }

  stop(): void {
    if (!this.recorder) return
    try {
      this.recorder.stop()
      // final state is handled in onstop
    } catch {
      // swallow
    }
  }

  discard(): void {
    this.stopTimer()
    try {
      if (this.recorder && this.recorder.state !== "inactive")
        this.recorder.stop()
    } catch {
      // ignore
    } finally {
      this.recorder = null
    }
    this.chunks = []
    this.cleanupStream()
    this.state = {
      phase: "idle",
      recordingTimeSec: 0,
      canPause: false,
      canResume: false,
      hasRecording: false,
      audioBlob: undefined,
      error: undefined,
    }
    this.emit({ type: "phase", phase: "idle" })
  }
}
