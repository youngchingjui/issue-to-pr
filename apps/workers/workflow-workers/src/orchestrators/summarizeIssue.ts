import { OpenAIAdapter } from "@/shared/adapters/llm/OpenAIAdapter"
import summarizeIssueUseCase from "@/shared/usecases/workflows/summarizeIssue"

import { getEnvVar } from "../helper"

export const summarizeIssue = async ({
  title,
  body,
}: {
  title: string
  body: string
}): Promise<string> => {
  const { OPENAI_API_KEY } = getEnvVar()

  const llm = new OpenAIAdapter(OPENAI_API_KEY)

  return summarizeIssueUseCase(llm, { title, body }, { model: "gpt-4o" })
}
