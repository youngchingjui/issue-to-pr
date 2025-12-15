import { VoiceSubmitPort } from "@/lib/types/voice"

export default class MockVoiceSubmitService<TReturn = unknown>
  implements VoiceSubmitPort<TReturn>
{
  async submit(audioBlob: Blob, mimeType?: string): Promise<TReturn> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 300))
    return {
      ok: true,
      adapter: "mock-submit",
      size: audioBlob.size,
      mimeType: mimeType ?? (audioBlob.type || null),
    } as unknown as TReturn
  }
}
