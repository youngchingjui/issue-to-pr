"use server"

import OpenAI from "openai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(audioFile: File): Promise<
  | {
      success: true
      text: string
    }
  | {
      success: false
      error: string
    }
> {
  try {
    // Ensure we have a valid file
    if (!audioFile || audioFile.size === 0) {
      return { success: false, error: "Missing or empty audio file" }
    }

    // Create the transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    })

    return { success: true, text: transcription.text }
  } catch (err) {
    console.error("Whisper transcription failed", err)
    return { success: false, error: String(err) }
  }
}

export async function getChatCompletion({
  systemPrompt,
  userPrompt,
}: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]
  const res = await openai.chat.completions.create({
    model: "gpt-5",
    messages,
  })
  return res.choices[0]?.message?.content || ""
}
