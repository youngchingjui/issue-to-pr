const API_URL = "https://api.assemblyai.com/v2"

import type {
  RealtimeTranscriptionConnection,
  SpeechPort,
} from "@/shared/src/core/ports/speech"

/**
 * Adapter for the AssemblyAI API providing basic speech-to-text and
 * text-to-speech capabilities. It also exposes a simple interface for
 * real-time streaming transcription using WebSockets.
 */
export class AssemblyAIAdapter implements SpeechPort {
  private readonly apiKey: string

  constructor(apiKey: string | undefined = process.env.ASSEMBLYAI_API_KEY) {
    if (!apiKey) {
      throw new Error("AssemblyAI API key is missing")
    }
    this.apiKey = apiKey
  }

  async transcribeFromUrl(audioUrl: string): Promise<string> {
    const response = await fetch(`${API_URL}/transcript`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    })

    const { id } = await response.json()

    // Poll until the transcription is complete
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const poll = await fetch(`${API_URL}/transcript/${id}`, {
        headers: { Authorization: this.apiKey },
      })
      const data = await poll.json()
      if (data.status === "completed") {
        return data.text as string
      }
      if (data.status === "error") {
        throw new Error(data.error || "Transcription failed")
      }
    }
  }

  async textToSpeech(text: string, voice = "default"): Promise<ArrayBuffer> {
    const response = await fetch(`${API_URL}/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`AssemblyAI text-to-speech failed: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  }

  async startRealtimeTranscription({
    sampleRate,
    onTranscription,
  }: {
    sampleRate: number
    onTranscription: (text: string) => void
  }): Promise<RealtimeTranscriptionConnection> {
    const url = new URL("wss://api.assemblyai.com/v2/realtime/ws")
    url.searchParams.set("sample_rate", sampleRate.toString())
    // AssemblyAI allows passing the key as a query parameter for simple clients
    url.searchParams.set("token", this.apiKey)

    const WS = (globalThis as any).WebSocket
    if (!WS) {
      throw new Error("WebSocket is not supported in this environment")
    }
    const ws = new WS(url)

    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(event.data as string)
        if (data.text) {
          onTranscription(data.text as string)
        }
      } catch {
        // ignore malformed messages
      }
    }

    return {
      sendAudio: (data: ArrayBuffer | Buffer) => ws.send(data),
      close: () => ws.close(),
    }
  }
}

export default AssemblyAIAdapter
