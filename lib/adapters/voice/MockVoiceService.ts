import { VoiceEvent, VoiceService, VoiceState } from "@/lib/types/voice"

// TODO: Implement
export default class MockVoiceService implements VoiceService {
  start(): Promise<void> {
    return Promise.resolve()
  }
  pause(): void {}
  resume(): void {}
  stop(): void {}
  discard(): void {}
  getState(): VoiceState {
    return {
      phase: "idle",
      recordingTimeSec: 0,
      canPause: false,
      canResume: false,
    }
  }
  subscribe(listener: (e: VoiceEvent) => void): () => void {
    return () => {}
  }
}
