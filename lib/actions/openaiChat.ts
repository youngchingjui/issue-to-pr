"use server"

import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { enqueueOpenAIJob } from "@/lib/queue/openaiQueue"

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
  // All OpenAI calls now go through queue
  const res = await enqueueOpenAIJob({
    params: {
      model: "gpt-4.1",
      messages,
    }
  })
  return res.choices[0]?.message?.content || ""
}
