import { VoiceEvent, VoicePort, VoiceState } from "@/lib/types/voice"

export default class MediaRecorderVoiceService implements VoicePort {
  private state: VoiceState = "idle"
  private listeners = new Set<(e: VoiceEvent) => void>()
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
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

  private cleanupStream() {
    try {
      this.stream?.getTracks().forEach((t) => t.stop())
    } finally {
      this.stream = null
    }
  }
  private fail(message: string) {
    this.state = "error"
    this.emit({ type: "error", message })
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail("Your browser does not support audio recording.")
      return
    }
    this.state = "starting"
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
        let blob: Blob
        try {
          blob = new Blob(this.chunks, { type: this.mimeType })
        } catch {
          blob = new Blob(this.chunks)
        }
        this.chunks = []
        this.cleanupStream()
        this.state = "ready"
        this.emit({ type: "ready", audioBlob: blob })
        this.recorder = null
      }

      this.recorder.start()
      this.state = "recording"
    } catch (err) {
      this.fail(`Unable to access microphone: ${String(err)}`)
      this.cleanupStream()
      this.recorder = null
      this.chunks = []
    }
  }

  pause(): void {
    if (!this.recorder || this.state !== "recording") return
    try {
      this.recorder.pause()
      this.state = "paused"
    } catch {
      // swallow
    }
  }

  resume(): void {
    if (!this.recorder || this.state !== "paused") return
    try {
      this.recorder.resume()
      this.state = "recording"
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
    this.state = "idle"
    this.emit({ type: "state", state: this.state })
  }
}
