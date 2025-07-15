"use server"

import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { openai } from "@/lib/openai"

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
    model: "gpt-4o",
    messages,
  })
  return res.choices[0]?.message?.content || ""
}

