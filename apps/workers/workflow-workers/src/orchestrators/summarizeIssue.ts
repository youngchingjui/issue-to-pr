import OpenAI from "openai"

import { getEnvVar } from "../helper"

export const summarizeIssue = async ({
  title,
  body,
}: {
  title: string
  body: string
}): Promise<string> => {
  // TODO: This is a service-level helper, and should be defined in /shared/src/services/issue.ts
  // to follow clean architecture principles.

  const { OPENAI_API_KEY } = getEnvVar()

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const systemPrompt =
    "You are an expert GitHub assistant. Given an issue title and body, produce a concise, actionable summary (2-4 sentences) highlighting the problem, scope, and desired outcome."
  const userPrompt = `Title: ${title ?? "(none)"}\n\nBody:\n${body ?? "(empty)"}`
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() ?? ""
}
