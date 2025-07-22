import { NextRequest, NextResponse } from "next/server"

import { openai } from "@/lib/openai"

// Whisper transcription endpoint
// Accepts multipart/form-data with field "file" containing an audio blob.
// Returns JSON: { text: string }

export const dynamic = "force-dynamic" // Ensure this is executed in a Node context

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 })
    }

    // Convert the incoming blob to a File object so that the OpenAI SDK can accept it.
    // In Node 18+, File is available globally via undici's fetch implementation.
    const audioFile = new File([file], "recording.webm", {
      type: file.type || "audio/webm",
    })

    // Call Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err) {
    console.error("Whisper transcription failed", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
