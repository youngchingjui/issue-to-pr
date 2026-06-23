import type {
  RealtimeTranscriptionConnection,
  SpeechPort,
} from "@/shared/src/core/ports/speech"

/**
 * Service layer wrapping a {@link SpeechPort} to provide higher level
 * operations for dealing with audio transcription and synthesis.
 */
export class TranscriptionService {
  constructor(private readonly speech: SpeechPort) {}

  /**
   * Transcribe audio from a publicly accessible URL.
   */
  async transcribeFromUrl(audioUrl: string): Promise<string> {
    return this.speech.transcribeFromUrl(audioUrl)
  }

  /**
   * Convert text to speech, returning raw audio data.
   */
  async textToSpeech(text: string, voice?: string): Promise<ArrayBuffer> {
    return this.speech.textToSpeech(text, voice)
  }

  /**
   * Open a realtime transcription connection. Audio can be streamed through the
   * returned connection while transcription results are delivered via the
   * provided callback.
   */
  async startRealtimeTranscription(options: {
    sampleRate: number
    onTranscription: (text: string) => void
  }): Promise<RealtimeTranscriptionConnection> {
    return this.speech.startRealtimeTranscription(options)
  }
}

export default TranscriptionService
