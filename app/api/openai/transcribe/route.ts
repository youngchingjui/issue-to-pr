import { NextRequest, NextResponse } from "next/server"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { transcribeAudio } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("[Transcribe API] POST /api/openai/transcribe invoked")

    // Get the form data containing the audio file
    const formData = await request.formData()
    console.log("[Transcribe API] formData entries:", [...formData.keys()])

    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      console.warn("[Transcribe API] Missing audio file in formData")
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 })
    }

    console.log("[Transcribe API] Received audio file", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    // Get user's OpenAI API key
    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      console.warn("[Transcribe API] Missing OpenAI API key for user")
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    console.log("[Transcribe API] Calling transcribeAudio()")
    // Transcribe the audio using the existing function
    const result = await transcribeAudio(audioFile)

    if (result.success) {
      console.log("[Transcribe API] Transcription success. Text length=", result.text.length)
      return NextResponse.json({ text: result.text }, { status: 200 })
    } else {
      console.error("[Transcribe API] Transcription failed", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("[Transcription API] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error },
      { status: 500 }
    )
  }
}

