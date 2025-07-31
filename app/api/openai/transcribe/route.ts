import { NextRequest, NextResponse } from "next/server"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { transcribeAudio } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    // Get the form data containing the audio file
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 })
    }

    // Get user's OpenAI API key
    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    // Transcribe the audio using the existing function
    const result = await transcribeAudio(audioFile)

    if (result.success) {
      return NextResponse.json({ text: result.text }, { status: 200 })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Transcription API error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error },
      { status: 500 }
    )
  }
}
