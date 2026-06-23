export interface RealtimeTranscriptionConnection {
  /** Send raw audio data (PCM 16-bit little-endian) to the provider */
  sendAudio(data: ArrayBuffer | Buffer): void
  /** Close the connection */
  close(): void
}

export interface SpeechPort {
  /**
   * Transcribes the audio available at the given URL and returns the full text
   */
  transcribeFromUrl(audioUrl: string): Promise<string>

  /**
   * Converts the provided text into spoken audio. Returns the raw audio data.
   */
  textToSpeech(text: string, voice?: string): Promise<ArrayBuffer>

  /**
   * Starts a streaming transcription session. The `onTranscription` callback is
   * invoked with partial or final transcripts as they are produced.
   */
  startRealtimeTranscription(options: {
    sampleRate: number
    onTranscription: (text: string) => void
  }): Promise<RealtimeTranscriptionConnection>
}
