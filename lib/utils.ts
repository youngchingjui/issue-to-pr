import { clsx, type ClassValue } from "clsx"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { twMerge } from "tailwind-merge"
import { z } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Code = z.object({
  code: z.string(),
})

export async function generateNewContent(
  existingContent: string,
  instructions: string
) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: existingContent },
    ],
    response_format: zodResponseFormat(Code, "code"),
  })

  return response.choices[0].message.parsed
}
